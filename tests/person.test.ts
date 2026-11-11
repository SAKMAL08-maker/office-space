import { Group, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { personColors } from "@/world/colors";
import { toOfficeInput } from "@/world/layout";
import { posePerson } from "@/world/pose";

/** The joints Person names, without drawing anything. */
function skeleton() {
  const root = new Group();
  const body = new Group();
  body.name = "body";
  root.add(body);
  for (const side of ["L", "R"]) {
    const hip = new Group();
    hip.name = `hip${side}`;
    const knee = new Group();
    knee.name = `knee${side}`;
    knee.position.y = -0.27;
    hip.add(knee);
    const shoulder = new Group();
    shoulder.name = `shoulder${side}`;
    body.add(hip, shoulder);
  }
  return root;
}

/** Which way a limb hanging from this joint points, after posing. */
function pointing(root: Group, name: string): Vector3 {
  root.updateMatrixWorld(true);
  const joint = root.getObjectByName(name)!;
  const start = joint.getWorldPosition(new Vector3());
  const end = joint.localToWorld(new Vector3(0, -1, 0));
  return end.sub(start).normalize();
}

describe("posePerson", () => {
  it("sits with thighs forward, shins down, and the body lowered", () => {
    const root = skeleton();
    posePerson(root, "sit", null);
    const thigh = pointing(root, "hipL");
    expect(thigh.z).toBeCloseTo(1);
    const shin = pointing(root, "kneeL");
    expect(shin.y).toBeCloseTo(-1);
    expect(root.getObjectByName("body")!.position.y).toBeLessThan(0);
  });

  it("stands straight when still, and swings opposite legs while walking", () => {
    const root = skeleton();
    posePerson(root, "sit", null);
    posePerson(root, "stand", null);
    expect(pointing(root, "hipL").y).toBeCloseTo(-1);
    expect(root.getObjectByName("body")!.position.y).toBe(0);

    posePerson(root, "stand", Math.PI / 2);
    expect(Math.sign(pointing(root, "hipL").z)).toBe(-Math.sign(pointing(root, "hipR").z));
  });
});

describe("personColors", () => {
  it("always gives the same person the same colours", () => {
    expect(personColors("user-1")).toEqual(personColors("user-1"));
    expect(personColors("")).toEqual(personColors(""));
  });
});

describe("toOfficeInput", () => {
  it("keeps only what the layout needs", () => {
    const cubicle = {
      projectId: "p",
      title: "T",
      description: "",
      sentBy: null,
      workingSince: null,
    };
    expect(
      toOfficeInput({
        ownerId: "a",
        name: "Ada",
        cubicles: [
          { ...cubicle, seat: 1 },
          { ...cubicle, seat: 4 },
        ],
      }),
    ).toEqual({ ownerId: "a", name: "Ada", seats: [1, 4] });
  });
});
