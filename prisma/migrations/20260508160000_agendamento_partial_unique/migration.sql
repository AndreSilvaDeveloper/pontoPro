-- Substitui o unique total no slot por um partial unique que ignora cancelados.
-- Assim um agendamento cancelado não trava a re-reserva do mesmo dataHora.
DROP INDEX IF EXISTS "agendamento_dataHora_key";

CREATE UNIQUE INDEX "agendamento_dataHora_key"
  ON "agendamento" ("dataHora")
  WHERE status <> 'CANCELADO';
