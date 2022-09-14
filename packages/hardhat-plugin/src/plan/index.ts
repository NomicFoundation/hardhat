import { IgnitionPlan } from "@nomicfoundation/ignition-core";
import { exec } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";

import { graphToMermaid, wrapInFlowchart, wrapInMermaidDiv } from "./utils";

/**
 * file structure output:
 *
 *  cache/
 *    plan/
 *      execution/
 *        <vertex>.html
 *      recipe/
 *        <vertex>.html
 *      index.html
 */

interface RendererConfig {
  cachePath: string;
}
/**
 * this is only temporary, until we get a proper build tool that will
 * include the html template files in the build output dir
 */
const htmlTemplate = `
<html>
  <body>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
      mermaid.initialize({ startOnLoad: true, securityLevel: "loose" });
    </script>

    $
  </body>
</html>
`;

export class Renderer {
  private _htmlTemplate: string = "";
  private _vertexTemplate: string = "";

  constructor(public plan: IgnitionPlan, public config: RendererConfig) {
    // ensure `plan` file structure once on construction
    // so we don't have to before every write function later
    this._ensureDirectoryStructure();
  }

  public write(): void {
    const mainOutput = this.getIndexOutput();
    this._writeMainHTML(this.htmlTemplate.replace("$", mainOutput));

    // the stringify in these loops is just a first draft version
    // they'll be full html pages with styles at some point
    for (const vertex of this.plan.recipeGraph.vertexes.values()) {
      this._writeRecipeHTML(vertex.id, JSON.stringify(vertex, null, 2));
    }

    for (const vertex of this.plan.executionGraph.vertexes.values()) {
      this._writeExecutionHTML(vertex.id, JSON.stringify(vertex, null, 2));
    }
  }

  /**
   * opens the main `plan` file in the user's default browser
   *
   * assumes Renderer.write() was called before this
   */
  public open(): void {
    let command: string;
    switch (os.platform()) {
      case "win32":
        command = "start";
        break;
      case "darwin":
        command = "open";
        break;
      default:
        command = "xdg-open";
    }

    exec(`${command} ${path.resolve(this.planPath, "index.html")}`);
  }

  public getIndexOutput(): string {
    const recipeBody = graphToMermaid(this.plan.recipeGraph, this.recipePath);
    const executionBody = graphToMermaid(
      this.plan.executionGraph,
      this.executionPath
    );

    const recipeFlowchart = wrapInMermaidDiv(
      wrapInFlowchart("RecipeGraph", recipeBody)
    );
    const executionFlowchart = wrapInMermaidDiv(
      wrapInFlowchart("ExecutionGraph", executionBody)
    );

    return this.htmlTemplate.replace(
      "$",
      `${recipeFlowchart}\n${executionFlowchart}`
    );
  }

  public get htmlTemplate(): string {
    // simple cache to avoid redundant fs reads
    // if (this._htmlTemplate === "") {
    //   this._htmlTemplate = fs.readFileSync(
    //     path.resolve(this._templatesPath, "index.html"),
    //     "utf8"
    //   );
    // }
    this._htmlTemplate = htmlTemplate; // temp hack - see comment at top of file
    return this._htmlTemplate;
  }

  public get vertexTemplate(): string {
    // simple cache to avoid redundant fs reads
    // if (this._vertexTemplate === "") {
    //   this._vertexTemplate = fs.readFileSync(
    //     path.resolve(this._templatesPath, "vertex.html"),
    //     "utf8"
    //   );
    // }
    return this._vertexTemplate;
  }

  public get planPath(): string {
    return path.resolve(this.config.cachePath, "plan");
  }

  public get recipePath(): string {
    return path.resolve(this.planPath, "recipe");
  }

  public get executionPath(): string {
    return path.resolve(this.planPath, "execution");
  }

  private get _templatesPath(): string {
    return path.resolve(__dirname, "templates");
  }

  private _writeExecutionHTML(id: number, text: string): void {
    fs.writeFileSync(`${this.executionPath}/${id}.json`, text, "utf8");
  }

  private _writeRecipeHTML(id: number, text: string): void {
    fs.writeFileSync(`${this.recipePath}/${id}.json`, text, "utf8");
  }

  private _writeMainHTML(text: string): void {
    fs.writeFileSync(`${this.planPath}/index.html`, text, "utf8");
  }

  private _ensureDirectoryStructure(): void {
    fs.ensureDirSync(this.recipePath);
    fs.ensureDirSync(this.executionPath);
  }
}
