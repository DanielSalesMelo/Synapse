import { describe, it, expect } from "vitest";

describe("Router structure", () => {
  it("should export appRouter with all expected sub-routers", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter).toBeDefined();
    
    const procedures = Object.keys(appRouter._def.procedures);
    
    // Auth
    expect(procedures).toContain("auth.me");
    expect(procedures).toContain("auth.logout");
    
    // Veículos
    expect(procedures).toContain("veiculos.list");
    expect(procedures).toContain("veiculos.create");
    expect(procedures).toContain("veiculos.getUltimoKm");
    expect(procedures).toContain("veiculos.listCavalos");
    
    // Funcionários
    expect(procedures).toContain("funcionarios.list");
    expect(procedures).toContain("funcionarios.listMotoristas");
    expect(procedures).toContain("funcionarios.listAjudantes");
    
    // Frota — Abastecimentos
    expect(procedures).toContain("frota.abastecimentos.list");
    expect(procedures).toContain("frota.abastecimentos.create");
    
    // Frota — Manutenções
    expect(procedures).toContain("frota.manutencoes.list");
    expect(procedures).toContain("frota.manutencoes.create");
    
    // Frota — Tanque
    expect(procedures).toContain("frota.tanque.list");
    expect(procedures).toContain("frota.tanque.saldoAtual");
    expect(procedures).toContain("frota.tanque.create");
    
    // Frota — Simulação
    expect(procedures).toContain("frota.calcularCustoViagem");
    expect(procedures).toContain("frota.listSimulacoes");
    expect(procedures).toContain("frota.salvarSimulacao");
    
    // Viagens
    expect(procedures).toContain("viagens.list");
    expect(procedures).toContain("viagens.create");
    
    // Multas
    expect(procedures).toContain("multas.list");
    expect(procedures).toContain("multas.create");
    
    // Financeiro
    expect(procedures).toContain("financeiro.pagar.list");
    expect(procedures).toContain("financeiro.receber.list");
    
    // Empresa
    expect(procedures).toContain("dashboard.empresas.list");
    
    // Adiantamentos
    expect(procedures).toContain("financeiro.adiantamentos.list");
    
    // Custos
    expect(procedures).toContain("custos.custoPorKm");
  });

  it("should have more than 50 procedures registered", async () => {
    const { appRouter } = await import("./routers");
    const count = Object.keys(appRouter._def.procedures).length;
    expect(count).toBeGreaterThan(50);
  });

  it("should have system health endpoint", async () => {
    const { appRouter } = await import("./routers");
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures).toContain("system.health");
  });
});
