-- Full 0.8.34 (evmVersion >= cancun) corpus extraction, all chains.
-- Adapted from slang's bigquery/pr_subset.sql (branch sourcify-corpus) with live
-- schema fixes: `public_` table prefix, block_number is a STRING, and
-- compiler_settings is a native JSON column.
--
-- One row per unique (fully_qualified_name, source set): identical re-deployments
-- add runtime without adding coverage. The canonical deployment prefers mainnet,
-- then the lowest chain id / block number, so names are stable across re-runs.
--
-- This is the only query that scans public_sources.content (~105 GB logical);
-- results land in a destination table so they are never re-scanned.

WITH
cc34 AS (
  SELECT
    id,
    fully_qualified_name,
    version,
    compiler_settings,
    -- Absent evmVersion means the compiler default, which for 0.8.34 is >= cancun.
    LOWER(COALESCE(JSON_VALUE(compiler_settings, '$.evmVersion'), '(default)')) AS evm_version
  FROM `@@DATASET@@.public_compiled_contracts`
  WHERE compiler = 'solc'
    AND language = 'solidity'
    AND version LIKE '0.8.34+%'
    AND LOWER(COALESCE(JSON_VALUE(compiler_settings, '$.evmVersion'), '(default)'))
        IN ('(default)', 'cancun', 'prague', 'osaka')
),

-- One canonical perfect-runtime-match deployment per compilation.
deployments AS (
  SELECT
    vc.compilation_id,
    ARRAY_AGG(
      STRUCT(cd.chain_id AS chain_id, cd.address AS address)
      ORDER BY (cd.chain_id != 1), cd.chain_id, SAFE_CAST(cd.block_number AS INT64)
      LIMIT 1
    )[OFFSET(0)] AS dep
  FROM `@@DATASET@@.public_verified_contracts` vc
  JOIN `@@DATASET@@.public_sourcify_matches` sm
    ON sm.verified_contract_id = vc.id
  JOIN `@@DATASET@@.public_contract_deployments` cd
    ON cd.id = vc.deployment_id
  WHERE sm.runtime_match = 'perfect'
    AND vc.compilation_id IN (SELECT id FROM cc34)
  GROUP BY vc.compilation_id
),

compilation_sources AS (
  SELECT
    ccs.compilation_id,
    ARRAY_AGG(STRUCT(ccs.path AS path, s.content AS content) ORDER BY ccs.path) AS sources,
    STRING_AGG(TO_HEX(ccs.source_hash), ',' ORDER BY TO_HEX(ccs.source_hash)) AS source_set,
    SUM(LENGTH(s.content)) AS total_bytes
  FROM `@@DATASET@@.public_compiled_contracts_sources` ccs
  JOIN `@@DATASET@@.public_sources` s
    ON s.source_hash = ccs.source_hash
  WHERE ccs.compilation_id IN (SELECT id FROM cc34)
  GROUP BY ccs.compilation_id
)

SELECT
  d.dep.chain_id AS chain_id,
  CONCAT('0x', TO_HEX(d.dep.address)) AS address,
  c.version,
  c.evm_version,
  c.fully_qualified_name,
  TO_JSON_STRING(c.compiler_settings) AS compiler_settings,
  cs.total_bytes,
  cs.sources
FROM cc34 c
JOIN deployments d ON d.compilation_id = c.id
JOIN compilation_sources cs ON cs.compilation_id = c.id
WHERE cs.total_bytes <= 8000000  -- skip pathologically large source sets
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY c.fully_qualified_name, cs.source_set
  ORDER BY (d.dep.chain_id != 1), d.dep.chain_id, address
) = 1
