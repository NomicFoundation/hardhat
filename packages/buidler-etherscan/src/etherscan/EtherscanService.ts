import request from 'request-promise';
import EtherscanVerifyContractRequest from "./EtherscanVerifyContractRequest";
import {BuidlerPluginError} from "@nomiclabs/buidler/plugins";

export default class EtherscanService {

    constructor(private readonly url: string) {
    }

    async verifyContract(req: EtherscanVerifyContractRequest): Promise<any> {
        try {
            const response: any =
                await request.post(
                    this.url,
                    {form: req, json: true}
                );
            if(response.status === "0") {
                throw new BuidlerPluginError(response.result);
            }
            return response;
        } catch (e) {
            throw new BuidlerPluginError('Failed to send contract verification request. Reason: ' + e.message, e);
        }
    }
}
