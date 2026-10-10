// Example for the existing xml-file-codec-service package.
// After the real package and its exact dependency closure are built:
// node examples/communicate-svg.mjs > communication.svg
// This produces an SVG value only. It does not send, publish, or admit work.
import {
  affirmedCharge,
  projectSvg,
  svgInteractiveProfile,
} from "@red-cup-engineering/xml-file-codec-service/svg";

const sourceRevision = "d94eb5c6a842dbf5a55c72604259a5fe3010e258";
const source = `https://github.com/red-cup-engineering/computer-data-services-section/tree/${sourceRevision}`;
const fromBox = { cx: 180, cy: 70, w: 290, h: 55 };
const toBox = { cx: 180, cy: 190, w: 290, h: 55 };
const charge = affirmedCharge();

const dataform = {
  width: 360,
  height: 260,
  title: "SVG communication example",
  desc: "Unpublished fixture: a source-bound relation readable as vector graphics and XML markup",
  nodes: [
    {
      e: "urn:561:example:source",
      a: "revision",
      v: sourceRevision,
      group: "source",
      label: "Existing SVG codec",
      title: "Source identity is explicit in the markup",
      href: source,
      data: { "source-url": source, "source-revision": sourceRevision },
      charge,
      box: fromBox,
    },
    {
      e: "urn:561:example:projection",
      a: "format",
      v: "image/svg+xml",
      group: "projection",
      label: "Human/model-readable SVG",
      title: "This example does not claim native message delivery or lossless decoding",
      charge,
      box: toBox,
    },
  ],
  edges: [
    {
      from: "urn:561:example:source",
      to: "urn:561:example:projection",
      kind: "projects",
      charge,
      fromBox,
      toBox,
    },
  ],
};

process.stdout.write(projectSvg(dataform, {
  profile: svgInteractiveProfile,
  declaration: true,
}) + "\n");
