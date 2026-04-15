import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Download, Upload, FileText, AlertCircle, CheckCircle2,
  Truck, Users, Navigation, Fuel, FileSpreadsheet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  exportarExcel, exportarCSV, importarArquivo,
  gerarTemplateVeiculos, gerarTemplateMotoristas, gerarTemplateViagens,
  gerarTemplateAbastecimentos, gerarTemplateNotasFiscais,
} from "@/lib/excelUtils";
import { toast } from "sonner";

export default function ImportExport() {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);

  const templates = [
    {
      id: "veiculos",
      nome: "Veículos",
      descricao: "Importar frota de veículos",
      icon: Truck,
      gerador: gerarTemplateVeiculos,
      campos: ["placa", "marca", "modelo", "ano", "tipo", "cor", "renavam", "chassi", "ativo"],
    },
    {
      id: "motoristas",
      nome: "Motoristas",
      descricao: "Importar dados de motoristas",
      icon: Users,
      gerador: gerarTemplateMotoristas,
      campos: ["nome", "cpf", "rg", "telefone", "email", "funcao", "tipoContrato", "salario", "dataAdmissao", "ativo"],
    },
    {
      id: "viagens",
      nome: "Viagens",
      descricao: "Importar histórico de viagens",
      icon: Navigation,
      gerador: gerarTemplateViagens,
      campos: ["data", "placa", "motorista", "origem", "destino", "kmSaida", "kmChegada", "status", "valor"],
    },
    {
      id: "abastecimentos",
      nome: "Abastecimentos",
      descricao: "Importar registros de abastecimento",
      icon: Fuel,
      gerador: gerarTemplateAbastecimentos,
      campos: ["data", "placa", "tipo", "litros", "valor", "km", "local"],
    },
    {
      id: "notas-fiscais",
      nome: "Notas Fiscais",
      descricao: "Importar notas fiscais de entregas",
      icon: FileText,
      gerador: gerarTemplateNotasFiscais,
      campos: ["numeroNf", "serie", "chaveAcesso", "destinatario", "cnpjDestinatario", "cidade", "uf", "valor", "peso", "volumes", "status"],
    },
  ];

  const handleDownloadTemplate = (gerador: () => void) => {
    try {
      gerador();
      toast.success("Template baixado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar template");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, templateId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const dados = await importarArquivo(file);
      setImportData(dados);
      toast.success(`${dados.length} registros carregados com sucesso!`);
    } catch (error) {
      toast.error("Erro ao importar arquivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("pages.import_export") || "Importar/Exportar"}</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie dados do sistema através de importação e exportação em Excel/CSV
        </p>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <Download className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="importar" className="gap-2">
            <Upload className="w-4 h-4" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="exportar" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Exportar
          </TabsTrigger>
        </TabsList>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.nome}</CardTitle>
                          <CardDescription className="text-xs mt-1">{template.descricao}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1">
                      <p className="font-medium text-muted-foreground">Campos inclusos:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.campos.slice(0, 5).map((campo) => (
                          <Badge key={campo} variant="secondary" className="text-xs">
                            {campo}
                          </Badge>
                        ))}
                        {template.campos.length > 5 && (
                          <Badge variant="secondary" className="text-xs">
                            +{template.campos.length - 5} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDownloadTemplate(template.gerador)}
                      className="w-full gap-2"
                      variant="outline"
                    >
                      <Download className="h-4 w-4" />
                      Baixar Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Importar */}
        <TabsContent value="importar" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{template.nome}</CardTitle>
                        <CardDescription className="text-xs mt-1">{template.descricao}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => handleFileUpload(e, template.id)}
                        disabled={uploading}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Clique ou arraste arquivo</p>
                      <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx, .xls) ou CSV</p>
                    </div>
                    {importData.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-lg p-3 text-sm">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium text-green-900 dark:text-green-400">{importData.length} registros carregados</p>
                            <p className="text-xs text-green-700 dark:text-green-500 mt-1">Pronto para importar no sistema</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <Button
                      disabled={importData.length === 0 || uploading}
                      className="w-full gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading ? "Carregando..." : "Importar"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Exportar */}
        <TabsContent value="exportar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Dados</CardTitle>
              <CardDescription>
                Exporte os dados do sistema em Excel ou CSV para análise e backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-400">Funcionalidade em desenvolvimento</p>
                    <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                      A exportação de dados será implementada em breve. Você poderá exportar todos os módulos (Veículos, Motoristas, Viagens, etc.) em Excel ou CSV.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Button
                        key={template.id}
                        variant="outline"
                        className="gap-2 justify-start h-auto py-3"
                        disabled
                      >
                        <Icon className="h-4 w-4" />
                        <div className="text-left">
                          <p className="text-sm font-medium">{template.nome}</p>
                          <p className="text-xs text-muted-foreground">Em breve</p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">📋 Formatos Suportados</p>
            <p className="text-muted-foreground">Excel (.xlsx, .xls) e CSV com codificação UTF-8</p>
          </div>
          <div>
            <p className="font-medium mb-1">✅ Validação</p>
            <p className="text-muted-foreground">Todos os dados são validados antes da importação. Erros serão reportados para correção.</p>
          </div>
          <div>
            <p className="font-medium mb-1">🔒 Segurança</p>
            <p className="text-muted-foreground">Os dados importados são isolados por empresa. Apenas administradores podem importar/exportar.</p>
          </div>
          <div>
            <p className="font-medium mb-1">📊 Templates</p>
            <p className="text-muted-foreground">Use os templates de demonstração para entender o formato esperado. Eles contêm exemplos reais.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
