use std::{collections::BTreeMap, path::Path};
#[derive(Debug, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct TestRun {
    title: String,
    full_title: String,
    file: String,
    duration: Option<u32>,
    current_retry: u32,
    speed: Option<String>,
    err: serde_json::Value,
}
#[derive(Debug, PartialEq, Eq, serde::Deserialize)]
struct TestRuns {
    tests: Vec<TestRun>,
}
#[derive(Debug)]
struct Diff {
    test_title: String,
    absolute_diff: u32,
    increase_percent: f64,
}
pub(crate) fn compare(baseline: &Path, candidate: &Path) -> anyhow::Result<()> {
    let baseline_runs = read_test_runs(baseline)?;
    let candidate_runs = read_test_runs(candidate)?;
    let mut diffs = Vec::new();
    for (key, candidate_run) in candidate_runs.iter() {
        if let Some(baseline_run) = baseline_runs.get(key) {
            match (baseline_run.duration, candidate_run.duration) {
                (Some(base_duration), Some(candidate_duration)) => {
                    if base_duration < candidate_duration {
                        let absolute_diff = candidate_duration - base_duration;
                        let increase_percent = if base_duration == 0 {
                            100.0
                        } else {
                            f64::from(candidate_duration) / f64::from(base_duration) * 100.0 - 100.0
                        };
                        diffs.push(Diff {
                            test_title: candidate_run.title.clone(),
                            absolute_diff,
                            increase_percent,
                        });
                    }
                }
                (Some(_), None) => println!("No candidate duration for `{key}`"),
                (None, Some(_)) => println!("No baseline duration for `{key}`"),
                (None, None) => {}
            }
        } else {
            println!("`{}` is a new test", candidate_run.title);
        }
    }

    diffs.sort_by(|a, b| b.absolute_diff.cmp(&a.absolute_diff));
    for diff in &diffs {
        println!(
            "`{}` is slower than baseline. Absolute diff: {} ms. Increase: {:.2} %",
            diff.test_title, diff.absolute_diff, diff.increase_percent
        );
    }

    Ok(())
}
fn read_test_runs(json_path: &Path) -> anyhow::Result<BTreeMap<String, TestRun>> {
    let runs: TestRuns = serde_json::from_reader(std::fs::File::open(json_path)?)?;
    let result = runs
        .tests
        .into_iter()
        .map(|run| (run.full_title.clone(), run))
        .collect();
    Ok(result)
}
