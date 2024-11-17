
# İstikrar garantileri
Sağlamlık desteği
Çevre değişkenleri
Eklentiler

@nomicfoundation/hardhat-toolbox
@nomicfoundation/hardhat-toolbox-viem
@noların hepsi birlikte çalışarak eksiksiz bir geliştirme ortamı oluşturur.

Hardhat Runner, Hardhat kullanırken etkileşim kurduğunuz ana bileşendir. Akıllı sözleşmeler ve dApp'ler geliştirmeye özgü tekrarlayan görevleri yönetmenize ve otomatikleştirmenize yardımcı olan esnek ve genişletilebilir bir görev yürütücüsüdür.

# Hardhat Runner, görev ve eklenti kavramları etrafında tasarlanmıştır . Hardhat'ı komut satırından her çalıştırdığınızda bir görev çalıştırıyorsunuz. Örneğin, npx hardhat compileyerleşik compilegörevi çalıştırır. Görevler diğer görevleri çağırabilir ve karmaşık iş akışlarının tanımlanmasına olanak tanır. Kullanıcılar ve eklentiler mevcut görevleri geçersiz kılabilir ve bu iş akışlarını özelleştirilebilir ve genişletilebilir hale getirebilir.

Bu kılavuz, önerdiğimiz kurulumun kurulumunu adım adım anlatacaktır; ancak Hardhat'ın işlevselliğinin çoğu eklentilerden geldiğinden, kurulumu özelleştirebilir veya tamamen farklı bir yol seçebilirsiniz.

# Kurulum
UÇ

Visual Studio Code için Hardhat
Solidity'ye gelişmiş desteği VSCode'a ekleyen resmi Hardhat uzantısıdır. Visual Studio Code kullanıyorsanız, deneyin!

Hardhat projenizde yerel bir kurulum aracılığıyla kullanılır. Bu şekilde ortamınız yeniden üretilebilir olacak ve gelecekteki sürüm çakışmalarından kaçınacaksınız.

Yüklemek için boş bir klasöre giderek, çalıştırarak npm initve talimatlarını izleyerek bir npm projesi oluşturmanız gerekir. yarn gibi başka bir paket yöneticisi kullanabilirsiniz, ancak Hardhat eklentilerini yüklemeyi daha basit hale getirdiği için npm 7 veya daha üstünü kullanmanızı öneririz.

# Projeniz hazır olduğunda, şunu çalıştırmalısınız:

npm 7+
npm 6
iplik
pnpm
npm install --save-dev hardhat
Hardhat'ın yerel kurulumunu kullanmak için npxonu çalıştırmanız gerekir (yani npx hardhat init).

# Hızlı Başlangıç
UÇ

Windows kullanıyorsanız, şunu kullanmanızı şiddetle öneririz:
WSL2
Bu kılavuzu takip etmek için.

Örnek bir sözleşme, bu sözleşmenin testleri ve onu dağıtmak için bir Hardhat Ignition modülü ile bir Hardhat projesi oluşturmanın temellerini inceleyeceğiz.

# Örnek projeyi oluşturmak için npx hardhat initproje klasörünüzde şunu çalıştırın:

$ npx hardhat init
888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

# 👷 Welcome to Hardhat v2.22.15 👷‍

? What do you want to do? …
❯ Create a JavaScript project
  Create a TypeScript project
  Create a TypeScript project (with Viem)
  Create an empty hardhat.config.js
  Quit
JavaScript veya TypeScript projesini oluşturalım ve örnek sözleşmeyi derlemek, test etmek ve dağıtmak için şu adımları izleyelim. TypeScript kullanmanızı öneririz, ancak aşina değilseniz JavaScript'i seçin.

# Çalışan görevler
Öncelikle nelerin mevcut olduğunu ve nelerin olup bittiğini hızlıca anlamak için npx hardhatproje klasörünüzde şunu çalıştırın:

$ npx hardhat
Hardhat version 2.9.9

Usage: hardhat [GLOBAL OPTIONS] <TASK> [TASK OPTIONS]

## GLOBAL OPTIONS:

  --config              A Hardhat config file.
  --emoji               Use emoji in messages.
  --help                Shows this message, or a task's help if its name is provided
  --max-memory          The maximum amount of memory that Hardhat can use.
  --network             The network to connect to.
  --show-stack-traces   Show stack traces.
  --tsconfig            A TypeScript config file.
  --verbose             Enables Hardhat verbose logging
  --version             Shows hardhat's version.


### AVAILABLE TASKS:

  check                 Check whatever you need
  clean                 Clears the cache and deletes all artifacts
  compile               Compiles the entire project, building all artifacts
  console               Opens a hardhat console
  coverage              Generates a code coverage report for tests
  flatten               Flattens and prints contracts and their dependencies
  help                  Prints this message
  node                  Starts a JSON-RPC server on top of Hardhat Network
  run                   Runs a user-defined script after compiling the project
  test                  Runs mocha tests
  typechain             Generate Typechain typings for compiled contracts
  verify                Verifies contract on Etherscan

To get help for a specific task run: npx hardhat help [task]
Kullanılabilir görevlerin listesi, yerleşik görevleri ve ayrıca yüklü eklentilerle birlikte gelen görevleri içerir. npx hardhatÇalıştırılabilecek görevlerin neler olduğunu bulmak için başlangıç ​​noktanızdır.

# Sözleşmelerinizi derlemek
Daha sonra klasöre baktığınızda şunları contracts/göreceksiniz Lock.sol:

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Lock {
    uint public unlockTime;
    address payable public owner;

    event Withdrawal(uint amount, uint when);

    constructor(uint _unlockTime) payable {
        require(
            block.timestamp < _unlockTime,
            "Unlock time should be in the future"
        );

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}

# Derlemek için şunu çalıştırmanız yeterli:

npx hardhat compile
Bir TypeScript projesi oluşturduysanız, bu görev ayrıca TypeScript bağlamalarını kullanarak da üretecektir.
TipZincir
.

# Sözleşmelerinizi test etme
Projeniz, aşağıdakileri kullanan testlerle birlikte gelir:
Moka
,
Çay
,
Eterler.js
Ve
Kask Ateşlemesi
.

# Klasöre bakarsanız test/bir test dosyası göreceksiniz:

Yazılı metin
```JavaScript
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployOneYearLockFixture() {
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const ONE_GWEI = 1_000_000_000;

    const lockedAmount = ONE_GWEI;
    const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners();

    const Lock = await ethers.getContractFactory("Lock");
    const lock = await Lock.deploy(unlockTime, { value: lockedAmount });

    return { lock, unlockTime, lockedAmount, owner, otherAccount };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const { lock, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      const { lock, lockedAmount } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await ethers.provider.getBalance(lock.target)).to.equal(
        lockedAmount
      );
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = await time.latest();
      const Lock = await ethers.getContractFactory("Lock");
      await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
        "Unlock time should be in the future"
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await loadFixture(deployOneYearLockFixture);

        await expect(lock.withdraw()).to.be.revertedWith(
          "You can't withdraw yet"
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { lock, unlockTime, otherAccount } = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
          "You aren't the owner"
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { lock, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.changeEtherBalances(
          [owner, lock],
          [lockedAmount, -lockedAmount]
        );
      });
    });
  });
});

```
# Testlerinizi şu şekilde çalıştırabilirsiniz npx hardhat test:

Yazılı metin
```JavaScript
$ npx hardhat test
Compiled 2 Solidity files successfully


  Lock
    Deployment
      ✔ Should set the right unlockTime (610ms)
      ✔ Should set the right owner
      ✔ Should receive and store the funds to lock
      ✔ Should fail if the unlockTime is not in the future
    Withdrawals
      Validations
        ✔ Should revert with the right error if called too soon
        ✔ Should revert with the right error if called from another account
        ✔ Shouldn't fail if the unlockTime has arrived and the owner calls it
      Events
        ✔ Should emit an event on withdrawals
      Transfers
        ✔ Should transfer the funds to the owner
  9 passing (790ms)

  ```

# Sözleşmelerinizi dağıtma
Sözleşmeyi dağıtmak için bir sonraki adımda Hardhat Ignition modülünü kullanacağız.

# Klasörün içerisinde ignition/modulesaşağıdaki kodun bulunduğu bir dosya bulacaksınız:

```
JavaScript
// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const JAN_1ST_2030 = 1893456000;
const ONE_GWEI = 1_000_000_000n;

module.exports = buildModule("LockModule", (m) => {
  const unlockTime = m.getParameter("unlockTime", JAN_1ST_2030);
  const lockedAmount = m.getParameter("lockedAmount", ONE_GWEI);

  const lock = m.contract("Lock", [unlockTime], {
    value: lockedAmount,
  });

  return { lock };
});

   ```
```
JavaScript
Bunu kullanarak dağıtabilirsiniz npx hardhat ignition deploy ./ignition/modules/Lock.js:

$ npx hardhat ignition deploy ./ignition/modules/Lock.js
Compiled 1 Solidity file successfully (evm target: paris).
You are running Hardhat Ignition against an in-process instance of Hardhat Network.
This will execute the deployment, but the results will be lost.
You can use --network <network-name> to deploy to a different network.

  ```
# Hardhat Ignition 🚀

Deploying [ LockModule ]

Batch #1
  Executed LockModule#Lock

[ LockModule ] successfully deployed 🚀

# Deployed Addresses

LockModule#Lock - 0xFa1dB6794de6e994b60741DecaE0567946992181
Daha fazlasını öğrenmek için şuraya göz atın:
Kask Ateşleme belgeleri
.

# Bir cüzdanı veya Dapp'ı Hardhat Ağına Bağlama
Varsayılan olarak, Hardhat başlangıçta Hardhat Network'ün yeni bir bellek içi örneğini döndürür. Hardhat Network'ü bağımsız bir şekilde çalıştırmak da mümkündür, böylece harici istemciler ona bağlanabilir. Bu bir cüzdan, Dapp ön ucunuz veya bir Hardhat Ignition dağıtımı olabilir.

Hardhat Network'ü bu şekilde çalıştırmak için şunu çalıştırın npx hardhat node:

$ npx hardhat node
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
Bu, Hardhat Network'e bir JSON-RPC arayüzü sunacaktır. Bunu kullanmak için cüzdanınızı veya uygulamanızı http://127.0.0.1:8545.

Örneğin, Hardhat'ı bu düğüme bağlamak istiyorsanız, onu kullanarak çalıştırmanız yeterlidir --network localhost.

Bunu denemek için, bir düğümü başlatın npx hardhat nodeve şu seçeneği kullanarak dağıtımı yeniden çalıştırın network:

Yazılı metin
JavaScript
npx hardhat ignition deploy ./ignition/modules/Lock.js --network localhost
Hardhat Network'ü belirli bir portta çalıştırmak ve belirli bir ağ arabiriminden veya ana bilgisayar adından gelen isteklere izin vermek için npx hardhat node --hostname 127.0.0.1 --port 8545.

Eğer harici ip'ler dahil her yerden gelen isteklere izin vermek istiyorsanız --hostname 0.0.0.0.

Tebrikler! Bir proje oluşturdunuz ve akıllı bir sözleşmeyi derlediniz, test ettiniz ve dağıttınız.


Bu sayfayı geliştirmemize yardımcı olun
Son Güncelleme:
07.10.2024 12:44:11
