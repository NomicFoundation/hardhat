# Deployment artifacts

- What's in the deployment folder
  - The journal
  - Artifacts and buildinfos
    - They follow the same format than hardhat
    - Any future that represents a contract (this includes libraries and contract at) has its artifact stored with its future id as file name
  - Contract addresses
    - A map of the succesfully deployed addresses
    - Each key is a future id
    - Every future representing a contract (this includes libraries and contract at) is present
