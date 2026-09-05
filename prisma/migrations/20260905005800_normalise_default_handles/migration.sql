-- Connections saved before the canvas and the engine agreed on a name.
--
-- The default handles were labelled "source-1" and "target-1", while the engine
-- decides which edges to follow by matching against "main". Nothing matched, so
-- every workflow whose edges came from a default handle ran its trigger and
-- stopped, while still reporting success.
--
-- Named outputs from branching nodes ("true", "false", a Switch rule id, "loop",
-- "done") are left alone: those were already written and matched correctly.

UPDATE "Connection" SET "fromOutput" = 'main' WHERE "fromOutput" = 'source-1';
UPDATE "Connection" SET "toInput" = 'main' WHERE "toInput" = 'target-1';
