import * as XLSX from 'xlsx';

/**
 * Exportar dados para Excel
 */
export function exportarExcel(
  dados: any[],
  nomeArquivo: string,
  nomeAba: string = "Dados"
) {
  if (dados.length === 0) {
    alert("Nenhum dado para exportar");
    return;
  }

  // Criar workbook
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nomeAba);

  // Ajustar largura das colunas
  const colWidths = Object.keys(dados[0]).map(() => 15);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  // Baixar arquivo
  XLSX.writeFile(wb, `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exportar dados para CSV
 */
export function exportarCSV(
  dados: any[],
  nomeArquivo: string
) {
  if (dados.length === 0) {
    alert("Nenhum dado para exportar");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(dados);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${nomeArquivo}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Importar dados de Excel/CSV
 */
export async function importarArquivo(
  arquivo: File
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const primeiraAba = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[primeiraAba];
        const dados = XLSX.utils.sheet_to_json(worksheet);
        resolve(dados);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsBinaryString(arquivo);
  });
}

/**
 * Gerar template de demonstração para Veículos
 */
export function gerarTemplateVeiculos() {
  const template = [
    {
      placa: "ABC-1234",
      marca: "Scania",
      modelo: "R440",
      ano: 2020,
      tipo: "truck",
      cor: "Branco",
      renavam: "12345678901234",
      chassi: "9BD123456789ABCD0",
      ativo: "Sim",
    },
    {
      placa: "XYZ-5678",
      marca: "Volvo",
      modelo: "FH16",
      ano: 2021,
      tipo: "cavalo",
      cor: "Azul",
      renavam: "98765432109876",
      chassi: "9BD987654321ABCD0",
      ativo: "Sim",
    },
  ];
  exportarExcel(template, "template_veiculos", "Veículos");
}

/**
 * Gerar template de demonstração para Motoristas
 */
export function gerarTemplateMotoristas() {
  const template = [
    {
      nome: "João Silva",
      cpf: "123.456.789-00",
      rg: "12.345.678-9",
      telefone: "(11) 98765-4321",
      email: "joao@example.com",
      funcao: "motorista",
      tipoContrato: "clt",
      salario: 3500.00,
      dataAdmissao: "2020-01-15",
      ativo: "Sim",
    },
    {
      nome: "Maria Santos",
      cpf: "987.654.321-00",
      rg: "98.765.432-1",
      telefone: "(11) 99876-5432",
      email: "maria@example.com",
      funcao: "motorista",
      tipoContrato: "clt",
      salario: 3500.00,
      dataAdmissao: "2020-06-01",
      ativo: "Sim",
    },
  ];
  exportarExcel(template, "template_motoristas", "Motoristas");
}

/**
 * Gerar template de demonstração para Viagens
 */
export function gerarTemplateViagens() {
  const template = [
    {
      data: "2024-04-01",
      placa: "ABC-1234",
      motorista: "João Silva",
      origem: "São Paulo",
      destino: "Rio de Janeiro",
      kmSaida: 125000,
      kmChegada: 125350,
      status: "concluida",
      valor: 1500.00,
    },
    {
      data: "2024-04-02",
      placa: "XYZ-5678",
      motorista: "Maria Santos",
      origem: "São Paulo",
      destino: "Belo Horizonte",
      kmSaida: 98000,
      kmChegada: 98420,
      status: "concluida",
      valor: 1200.00,
    },
  ];
  exportarExcel(template, "template_viagens", "Viagens");
}

/**
 * Gerar template de demonstração para Abastecimentos
 */
export function gerarTemplateAbastecimentos() {
  const template = [
    {
      data: "2024-04-01",
      placa: "ABC-1234",
      tipo: "diesel",
      quantidade: 150,
      valor: 750.00,
      km: 125000,
      local: "Posto Shell - São Paulo",
    },
    {
      data: "2024-04-02",
      placa: "XYZ-5678",
      tipo: "diesel",
      quantidade: 120,
      valor: 600.00,
      km: 98000,
      local: "Posto Ipiranga - Campinas",
    },
  ];
  exportarExcel(template, "template_abastecimentos", "Abastecimentos");
}

/**
 * Gerar template de demonstração para Notas Fiscais
 */
export function gerarTemplateNotasFiscais() {
  const template = [
    {
      numeroNf: "000001",
      serie: "1",
      chaveAcesso: "35240101234567000123550010000000011234567890",
      destinatario: "Empresa XYZ",
      cnpjDestinatario: "12.345.678/0001-90",
      cidade: "São Paulo",
      uf: "SP",
      valor: 5000.00,
      peso: 500.0,
      volumes: 10,
      status: "entregue",
    },
    {
      numeroNf: "000002",
      serie: "1",
      chaveAcesso: "35240101234567000123550010000000021234567890",
      destinatario: "Empresa ABC",
      cnpjDestinatario: "98.765.432/0001-10",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      valor: 3500.00,
      peso: 350.0,
      volumes: 7,
      status: "entregue",
    },
  ];
  exportarExcel(template, "template_notas_fiscais", "NFs");
}
