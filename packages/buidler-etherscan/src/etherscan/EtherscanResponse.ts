
export default class EtherscanResponse {

    public readonly status: number;

    public readonly message: string;

    public constructor(response: any) {
        this.status = parseInt(response.status);
        this.message = response.result;
    }

    isPending() {
        return this.message === 'Pending in queue';
    }

    isOk() {
        return this.status === 1;
    }

}
