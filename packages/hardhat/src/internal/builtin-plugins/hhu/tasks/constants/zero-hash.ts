import type { NewUtilsTaskActionFunction } from "../../types.js";

const zeroHash =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const zeroHashAction: NewUtilsTaskActionFunction = async () => {
  console.log(zeroHash);
};

export default zeroHashAction;
