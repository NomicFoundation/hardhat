import type { NewUtilsTaskActionFunction } from "../../types.js";

const zeroAddress = "0x0000000000000000000000000000000000000000";

const zeroAddressAction: NewUtilsTaskActionFunction = async () => {
  console.log(zeroAddress);
};

export default zeroAddressAction;
