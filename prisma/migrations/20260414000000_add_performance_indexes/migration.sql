-- Performance indexes para consultas pesadas (pontos, solicitações, ausências, feriados, logs)

-- Ponto: usuário + dataHora é a consulta mais comum (histórico, banco de horas, dashboard)
CREATE INDEX IF NOT EXISTS "Ponto_usuarioId_dataHora_idx" ON "Ponto"("usuarioId", "dataHora");
CREATE INDEX IF NOT EXISTS "Ponto_dataHora_idx" ON "Ponto"("dataHora");

-- SolicitacaoAjuste: status PENDENTE é consultado o tempo todo
CREATE INDEX IF NOT EXISTS "SolicitacaoAjuste_usuarioId_idx" ON "SolicitacaoAjuste"("usuarioId");
CREATE INDEX IF NOT EXISTS "SolicitacaoAjuste_status_idx" ON "SolicitacaoAjuste"("status");
CREATE INDEX IF NOT EXISTS "SolicitacaoAjuste_pontoId_idx" ON "SolicitacaoAjuste"("pontoId");

-- Ausencia: status + range de datas
CREATE INDEX IF NOT EXISTS "Ausencia_usuarioId_idx" ON "Ausencia"("usuarioId");
CREATE INDEX IF NOT EXISTS "Ausencia_status_idx" ON "Ausencia"("status");
CREATE INDEX IF NOT EXISTS "Ausencia_dataInicio_dataFim_idx" ON "Ausencia"("dataInicio", "dataFim");

-- Feriado: listagem por empresa e data
CREATE INDEX IF NOT EXISTS "Feriado_empresaId_data_idx" ON "Feriado"("empresaId", "data");

-- LogAuditoria: página de auditoria ordena por data DESC por empresa
CREATE INDEX IF NOT EXISTS "LogAuditoria_empresaId_dataHora_idx" ON "LogAuditoria"("empresaId", "dataHora");
