DROP VIEW IF EXISTS Vista_Pipeline_Stats;

CREATE VIEW Vista_Pipeline_Stats AS
SELECT
    Etapa,
    COUNT(*) AS Total,
    SUM(COALESCE(ValorEstimado, 0)) AS ValorTotal,
    AVG(COALESCE(ValorEstimado, 0)) AS ValorPromedio,
    COUNT(CASE WHEN FechaProximaAccion <= DATE('now') THEN 1 END) AS AccionesVencidas
FROM Oportunidades
WHERE Etapa NOT IN ('CIERRE_GANADO', 'CIERRE_PERDIDO')
GROUP BY Etapa;
