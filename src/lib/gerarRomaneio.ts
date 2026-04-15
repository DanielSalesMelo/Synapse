/**
 * Gerador de Romaneio em PDF
 * Usa a API nativa do navegador (window.print) com um iframe oculto
 * para gerar um PDF formatado sem dependências externas.
 */

interface ItemRomaneio {
  ordemEntrega?: number | null;
  numeroNf: string;
  serie?: string | null;
  destinatario?: string | null;
  cidade?: string | null;
  uf?: string | null;
  enderecoEntrega?: string | null;
  valorNf?: string | null;
  pesoKg?: string | null;
  volumes?: number | null;
  descricaoCarga?: string | null;
  status: string;
}

interface DadosRomaneio {
  numero: string;
  data: string;
  veiculoPlaca?: string | null;
  motoristaNome?: string | null;
  ajudanteNome?: string | null;
  rotaDescricao?: string | null;
  cidadesRota?: string | null;
  totalNfs: number;
  totalVolumes: number;
  totalPesoKg: string;
  totalValorNfs: string;
  itens: ItemRomaneio[];
  empresaNome?: string;
}

const fmt = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  entregue: "Entregue",
  devolvida: "Devolvida",
  parcial: "Parcial",
  extraviada: "Extraviada",
};

export function gerarRomaneio(dados: DadosRomaneio) {
  const dataFormatada = new Date(dados.data).toLocaleDateString("pt-BR");
  const agora = new Date().toLocaleString("pt-BR");

  const linhasItens = dados.itens
    .sort((a, b) => (a.ordemEntrega ?? 999) - (b.ordemEntrega ?? 999))
    .map((item, idx) => {
      const statusLabel = STATUS_LABEL[item.status] ?? item.status;
      const statusColor =
        item.status === "entregue" ? "#16a34a" :
        item.status === "devolvida" ? "#dc2626" :
        item.status === "parcial" ? "#ea580c" :
        item.status === "extraviada" ? "#be123c" :
        "#92400e";

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 6px 8px; text-align: center; font-size: 12px; color: #6b7280;">${item.ordemEntrega ?? idx + 1}</td>
          <td style="padding: 6px 8px; font-size: 12px; font-weight: 600;">${item.numeroNf}${item.serie ? `-${item.serie}` : ""}</td>
          <td style="padding: 6px 8px; font-size: 11px;">
            <div style="font-weight: 500;">${item.destinatario ?? "—"}</div>
            <div style="color: #6b7280; font-size: 10px;">${item.enderecoEntrega ?? ""}</div>
            <div style="color: #6b7280; font-size: 10px;">${item.cidade ?? ""}${item.uf ? `/${item.uf}` : ""}</div>
          </td>
          <td style="padding: 6px 8px; font-size: 11px; text-align: right;">${item.valorNf ? fmt(item.valorNf) : "—"}</td>
          <td style="padding: 6px 8px; font-size: 11px; text-align: center;">${item.pesoKg ? `${Number(item.pesoKg).toFixed(1)} kg` : "—"}</td>
          <td style="padding: 6px 8px; font-size: 11px; text-align: center;">${item.volumes ?? "—"}</td>
          <td style="padding: 6px 8px; font-size: 11px; text-align: center;">
            <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
          </td>
          <td style="padding: 6px 8px; font-size: 10px; color: #6b7280;">${item.descricaoCarga ?? ""}</td>
        </tr>
      `;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Romaneio ${dados.numero}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; color: #111; background: #fff; padding: 20px; }
        @media print {
          body { padding: 10px; }
          .no-print { display: none !important; }
        }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: 2px solid #111; padding-bottom: 12px; }
        .title { font-size: 22px; font-weight: 700; }
        .subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }
        .empresa { font-size: 14px; font-weight: 600; }
        .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
        .info-item label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
        .info-item p { font-size: 13px; font-weight: 600; margin-top: 2px; }
        .totais { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
        .total-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; text-align: center; }
        .total-box label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
        .total-box p { font-size: 16px; font-weight: 700; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; }
        thead tr { background: #111; color: #fff; }
        thead th { padding: 8px; font-size: 11px; text-align: left; }
        tbody tr:nth-child(even) { background: #f9fafb; }
        .assinaturas { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 32px; }
        .assinatura { border-top: 1px solid #111; padding-top: 8px; text-align: center; font-size: 11px; color: #6b7280; }
        .rodape { margin-top: 16px; font-size: 10px; color: #9ca3af; text-align: right; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        .btn-print { display: inline-flex; align-items: center; gap: 8px; background: #111; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
        .btn-print:hover { background: #333; }
      </style>
    </head>
    <body>
      <button class="btn-print no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>

      <div class="header">
        <div>
          <div class="title">ROMANEIO DE ENTREGA</div>
          <div class="subtitle">Carregamento ${dados.numero} — ${dataFormatada}</div>
        </div>
        <div style="text-align: right;">
          <div class="empresa">${dados.empresaNome ?? "Rotiq"}</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Emitido em: ${agora}</div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <label>Veículo (Placa)</label>
          <p>${dados.veiculoPlaca ?? "—"}</p>
        </div>
        <div class="info-item">
          <label>Motorista</label>
          <p>${dados.motoristaNome ?? "—"}</p>
        </div>
        <div class="info-item">
          <label>Ajudante</label>
          <p>${dados.ajudanteNome ?? "—"}</p>
        </div>
        <div class="info-item">
          <label>Rota</label>
          <p>${dados.rotaDescricao ?? "—"}</p>
        </div>
        <div class="info-item" style="grid-column: span 2;">
          <label>Cidades</label>
          <p>${dados.cidadesRota ?? "—"}</p>
        </div>
      </div>

      <div class="totais">
        <div class="total-box">
          <label>Total de NFs</label>
          <p>${dados.totalNfs}</p>
        </div>
        <div class="total-box">
          <label>Total de Volumes</label>
          <p>${dados.totalVolumes}</p>
        </div>
        <div class="total-box">
          <label>Peso Total</label>
          <p>${Number(dados.totalPesoKg || 0).toFixed(1)} kg</p>
        </div>
        <div class="total-box">
          <label>Valor Total das NFs</label>
          <p style="color: #16a34a;">${fmt(dados.totalValorNfs)}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">#</th>
            <th style="width: 70px;">NF / Série</th>
            <th>Destinatário / Endereço</th>
            <th style="width: 90px; text-align: right;">Valor</th>
            <th style="width: 70px; text-align: center;">Peso</th>
            <th style="width: 50px; text-align: center;">Vol.</th>
            <th style="width: 80px; text-align: center;">Status</th>
            <th style="width: 120px;">Carga</th>
          </tr>
        </thead>
        <tbody>
          ${linhasItens || `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #6b7280;">Nenhuma NF adicionada</td></tr>`}
        </tbody>
      </table>

      <div class="assinaturas">
        <div class="assinatura">Motorista: ${dados.motoristaNome ?? "_______________"}<br/>Assinatura</div>
        <div class="assinatura">Ajudante: ${dados.ajudanteNome ?? "_______________"}<br/>Assinatura</div>
        <div class="assinatura">Responsável pela Expedição<br/>Assinatura</div>
      </div>

      <div class="rodape">
        Rotiq — Sistema de Gestão de Transporte | Romaneio ${dados.numero} | ${agora}
      </div>
    </body>
    </html>
  `;

  // Abre em nova aba para impressão/download como PDF
  const win = window.open("", "_blank", "width=900,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
