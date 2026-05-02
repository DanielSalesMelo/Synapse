import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useViewAs } from "@/contexts/ViewAsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportarCSV, exportarExcel } from "@/lib/excelUtils";

type PreviewResponse = {
  batchId: number;
  totalRows: number;
  validRows: number;
  errorRows: number;
  preview: Array<Record<string, any>>;
  errors: Array<{ index: number; errors: string[] }>;
};

function downloadTemplate(meta: any) {
  const instructions = [
    ["Módulo", meta.nome],
    ["Descrição", meta.descricao],
    ["Campos obrigatórios", meta.camposObrigatorios.join(", ")],
    ["Observação", "Preencha a aba Dados e importe no Synapse."],
  ];

  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
  const blankRow = meta.colunas.reduce((acc: Record<string, string>, column: string) => {
    acc[column] = "";
    return acc;
  }, {});
  const dataSheet = XLSX.utils.json_to_sheet([blankRow]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instrucoes");
  XLSX.utils.book_append_sheet(workbook, dataSheet, "Dados");
  XLSX.writeFile(workbook, `template_${meta.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

async function parseFile(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames.find((name) => name.toLowerCase() !== "instrucoes") ?? workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });
}

export default function ImportExport() {
  const { effectiveEmpresaId } = useViewAs();
  const [uploading, setUploading] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewModulo, setPreviewModulo] = useState<string | null>(null);

  const templatesQ = trpc.imports.templates.useQuery();
  const batchesQ = trpc.imports.listBatches.useQuery(
    { empresaId: effectiveEmpresaId },
    { enabled: !!effectiveEmpresaId }
  );

  const veiculosQ = trpc.veiculos.list.useQuery(
    { empresaId: effectiveEmpresaId },
    { enabled: !!effectiveEmpresaId }
  ) as any;
  const funcionariosQ = trpc.funcionarios.list.useQuery(
    { empresaId: effectiveEmpresaId },
    { enabled: !!effectiveEmpresaId }
  ) as any;
  const pagarQ = trpc.financeiro.pagar.list.useQuery(
    { empresaId: effectiveEmpresaId, limit: 200 },
    { enabled: !!effectiveEmpresaId }
  ) as any;
  const receberQ = trpc.financeiro.receber.list.useQuery(
    { empresaId: effectiveEmpresaId, limit: 200 },
    { enabled: !!effectiveEmpresaId }
  ) as any;

  const createPreview = trpc.imports.createPreview.useMutation({
    onSuccess: (data, variables) => {
      setPreview(data as PreviewResponse);
      setPreviewModulo(variables.modulo);
      batchesQ.refetch();
      toast.success("Pré-validação concluída.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível gerar a prévia."),
  });

  const confirmBatch = trpc.imports.confirmBatch.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.imported} registros importados com sucesso.`);
      setPreview(null);
      setPreviewModulo(null);
      batchesQ.refetch();
      veiculosQ.refetch?.();
      funcionariosQ.refetch?.();
      pagarQ.refetch?.();
      receberQ.refetch?.();
    },
    onError: (error) => toast.error(error.message || "Não foi possível concluir a importação."),
  });

  const exportOptions = useMemo(() => ([
    {
      id: "veiculos",
      nome: "Veículos",
      dados: (veiculosQ.data ?? []).map((row: any) => ({
        placa: row.placa,
        tipo: row.tipo,
        marca: row.marca,
        modelo: row.modelo,
        ano: row.ano,
        mediaConsumo: row.mediaConsumo,
        ativo: row.ativo,
      })),
    },
    {
      id: "funcionarios",
      nome: "Funcionários",
      dados: (funcionariosQ.data ?? []).map((row: any) => ({
        nome: row.nome,
        funcao: row.funcao,
        tipoContrato: row.tipoContrato,
        telefone: row.telefone,
        email: row.email,
        salario: row.salario,
        ativo: row.ativo,
      })),
    },
    {
      id: "contas_pagar",
      nome: "Contas a Pagar",
      dados: (pagarQ.data ?? []).map((row: any) => ({
        descricao: row.descricao,
        categoria: row.categoria,
        valor: row.valor,
        dataVencimento: row.dataVencimento,
        status: row.status,
        fornecedor: row.fornecedor,
      })),
    },
    {
      id: "contas_receber",
      nome: "Contas a Receber",
      dados: (receberQ.data ?? []).map((row: any) => ({
        descricao: row.descricao,
        categoria: row.categoria,
        valor: row.valor,
        dataVencimento: row.dataVencimento,
        status: row.status,
        cliente: row.cliente,
      })),
    },
  ]), [funcionariosQ.data, pagarQ.data, receberQ.data, veiculosQ.data]);

  const handleUpload = async (file: File, modulo: string) => {
    if (!effectiveEmpresaId) {
      toast.error("Selecione uma empresa antes de importar.");
      return;
    }

    setUploading(modulo);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.error("Nenhuma linha encontrada no arquivo.");
        return;
      }

      createPreview.mutate({
        empresaId: effectiveEmpresaId,
        modulo: modulo as any,
        fileName: file.name,
        rows,
      });
    } catch (error) {
      toast.error("Não foi possível ler a planilha.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar / Exportar</h1>
        <p className="text-muted-foreground mt-2">
          Trabalhe com planilhas reais, com pré-validação, confirmação e histórico por empresa.
        </p>
      </div>

      <Tabs defaultValue="importar" className="w-full">
        <TabsList>
          <TabsTrigger value="importar" className="gap-2">
            <Upload className="w-4 h-4" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="exportar" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <Database className="w-4 h-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(templatesQ.data ?? []).map((template: any) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-base">{template.nome}</CardTitle>
                  <CardDescription>{template.descricao}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {template.camposObrigatorios.map((campo: string) => (
                      <Badge key={campo} variant="secondary">{campo} *</Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => downloadTemplate(template)} className="flex-1">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Baixar Template
                    </Button>
                    <label className="flex-1">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleUpload(file, template.id);
                          event.currentTarget.value = "";
                        }}
                      />
                      <Button className="w-full" disabled={uploading === template.id || createPreview.isPending} asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploading === template.id ? "Lendo..." : "Enviar Planilha"}
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {preview && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prévia da Importação</CardTitle>
                <CardDescription>
                  Lote {preview.batchId} • módulo {previewModulo} • {preview.validRows} válidas / {preview.errorRows} com erro
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Linhas lidas</p>
                    <p className="text-2xl font-bold">{preview.totalRows}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Válidas</p>
                    <p className="text-2xl font-bold text-green-600">{preview.validRows}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Com erro</p>
                    <p className="text-2xl font-bold text-red-600">{preview.errorRows}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Amostra</p>
                  <div className="rounded-lg border overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr>
                          {preview.preview[0] && Object.keys(preview.preview[0]).map((key) => (
                            <th key={key} className="text-left px-2 py-2 font-medium">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.preview.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            {Object.values(row).map((value, valueIndex) => (
                              <td key={valueIndex} className="px-2 py-2">{String(value ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {preview.errors.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 mb-2 text-amber-700">
                      <AlertCircle className="h-4 w-4" />
                      <p className="font-medium">Linhas com inconsistência</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {preview.errors.slice(0, 10).map((error) => (
                        <div key={error.index}>
                          <p className="font-medium">Linha {error.index}</p>
                          <p className="text-muted-foreground">{error.errors.join(" ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => confirmBatch.mutate({ empresaId: effectiveEmpresaId, batchId: preview.batchId })}
                    disabled={preview.validRows === 0 || confirmBatch.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {confirmBatch.isPending ? "Importando..." : "Confirmar Importação"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="exportar" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exportOptions.map((option) => (
              <Card key={option.id}>
                <CardHeader>
                  <CardTitle className="text-base">{option.nome}</CardTitle>
                  <CardDescription>
                    {option.dados.length === 0 ? "Nenhum dado cadastrado." : `${option.dados.length} registros disponíveis.`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={option.dados.length === 0}
                    onClick={() => exportarExcel(option.dados, option.id, option.nome)}
                  >
                    Exportar Excel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={option.dados.length === 0}
                    onClick={() => exportarCSV(option.dados, option.id)}
                  >
                    Exportar CSV
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Lotes</CardTitle>
              <CardDescription>
                Últimos arquivos processados para a empresa ativa.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(batchesQ.data ?? []).map((batch: any) => (
                  <div key={batch.id} className="rounded-lg border p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-medium">{batch.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        {batch.modulo} • {batch.totalRows} linhas • {batch.validRows} válidas • {batch.errorRows} com erro
                      </p>
                    </div>
                    <Badge variant={batch.status === "importado" ? "default" : "secondary"}>
                      {batch.status}
                    </Badge>
                  </div>
                ))}
                {(batchesQ.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum lote cadastrado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
