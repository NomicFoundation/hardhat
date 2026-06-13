import type { NewTaskActionFunction } from "../../../../../types/tasks.js";

const zeroAddress = "0x0000000000000000000000000000000000000000";

const zeroAddressAction: NewTaskActionFunction = async () => {
  console.log(zeroAddress);
};

export default zeroAddressAction;
