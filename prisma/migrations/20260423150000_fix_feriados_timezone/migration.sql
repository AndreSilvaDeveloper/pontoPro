-- Fix de timezone em feriados importados da Brasil API.
-- O importador antigo chamava `new Date(y, m-1, d)` que, em servidores
-- UTC (containers Docker), salvava meia-noite UTC. Ao renderizar em
-- America/Sao_Paulo (UTC-3), o dia voltava um (ex: 01/01 virava 31/12).
--
-- O cadastro manual usa `fromZonedTime(... "America/Sao_Paulo")` que
-- salva em 03:00 UTC (meia-noite em SP). Esta migration normaliza os
-- registros antigos ao mesmo formato, adicionando 3 horas aos feriados
-- que estão em 00:00:00 UTC.
--
-- Horário de verão não existe mais no Brasil desde 2019, então BRT é
-- sempre UTC-3 — o deslocamento fixo é seguro.

UPDATE "Feriado"
SET "data" = "data" + INTERVAL '3 hours'
WHERE EXTRACT(HOUR FROM "data" AT TIME ZONE 'UTC') = 0
  AND EXTRACT(MINUTE FROM "data" AT TIME ZONE 'UTC') = 0
  AND EXTRACT(SECOND FROM "data" AT TIME ZONE 'UTC') = 0;
