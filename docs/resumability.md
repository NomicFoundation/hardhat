# Deployment Resumability (implementation TBD)

Currently, failed transactions will be retried a number of times, with an increasing gas price each time, up to a max retry limit. If it has failed past that point, the deployment is considered failed and will be stopped. But what happens if some transactions in the deployment had already succeeded?

Broadly speaking, if some part of the deployment fails, the user will be able to retry it, or to modify the failing action. With the help of an internal journaling service, successfully completed transactions would not be run a second time when resuming a partially failed deployment.

Similarly, a user with a deployment that is considered "on hold" and awaiting the completion of an external action of some kind (multisig wallet signatures, as an example) would be able to close the running **Ignition** process and resume the deployment safely whenever they choose without worrying about the previous actions being resolved again.

For non-development network deployments, this means some form of deployment freezing will be recommended that records relevant information such as contract abi, deployed address and network. These files will be recommended to be committed into project repositories as well.

The exact nature of these files is TBD as this feature is being developed.
