<template lang="pug">
  section#whos-using-hardhat
    .padded-container
      h1.section-title Trusted by top teams
    section.banner-container.banner-container-desktop

      .marquee-container(v-for="group of desktopUsers")
        .marquee-content
          .marquee    
            img(v-for="company of group" :title="company.company" :src="company.desktopImage")
          .marquee
            img(v-for="company of group" :title="company.company" :src="company.desktopImage")  
    section.banner-container.banner-container-mobile
      .marquee-container(v-for="group of mobileUsers")
        .marquee-content
          .marquee
            img(v-for="company of group" :title="company.company" :src="company.mobileImage")
          .marquee
            img(v-for="company of group" :title="company.company" :src="company.mobileImage")
</template>

<script>
// Decentraland
import DecentralandDesktopImage from "../img/company_logos/2x/logo-decentraland@2x.png";
import DecentralandMobileImage from "../img/company_logos/mobile/logo-decentraland@2x.png";

// Celer
import CelerDesktopImage from "../img/company_logos/2x/logo-celer@2x.png";
import CelerMobileImage from "../img/company_logos/mobile/logo-celer@2x.png";

// Skale
import SkaleDesktopImage from "../img/company_logos/2x/logo-skale@2x.png";
import SkaleMobileImage from "../img/company_logos/mobile/logo-skale@2x.png";

// Connext
import ConnextDesktopImage from "../img/company_logos/2x/logo-connext@2x.png";
import ConnextMobileImage from "../img/company_logos/mobile/logo-connext@2x.png";

// Aragon One
import AragonDesktopImage from "../img/company_logos/2x/logo-aone@2x.png";
import AragonMobileImage from "../img/company_logos/mobile/logo-aone@2x.png";

// Kyber Network
import KyberDesktopImage from "../img/company_logos/2x/logo-kyber@2x.png";
import KyberMobileImage from "../img/company_logos/mobile/logo-kyber@2x.png";

// AAVE
import AaveDesktopImage from "../img/company_logos/2x/logo-aave@2x.png";
import AaveMobileImage from "../img/company_logos/mobile/logo-aave@2x.png";

// Synthetix
import SynthetixDesktopImage from "../img/company_logos/2x/logo-synthetix@2x.png";
import SynthetixMobileImage from "../img/company_logos/mobile/logo-synthetix@2x.png";

// Pool Together
import PoolTogetherDesktopImage from "../img/company_logos/2x/logo-pool@2x.png";
import PoolTogetherMobileImage from "../img/company_logos/mobile/logo-pool@2x.png";

// Set
import SetDesktopImage from "../img/company_logos/2x/logo-set@2x.png";
import SetMobileImage from "../img/company_logos/mobile/logo-set@2x.png";

// Kleros
import KlerosDesktopImage from "../img/company_logos/2x/logo-kleros@2x.png";
import KlerosMobileImage from "../img/company_logos/mobile/logo-kleros@2x.png";

// Balancer
import BalancerDesktopImage from "../img/company_logos/2x/logo-Balancer@2x.png";
import BalancerMobileImage from "../img/company_logos/mobile/logo-Balancer@2x.png";

// Celo
import CeloDesktopImage from "../img/company_logos/2x/logo-celo@2x.png";
import CeloMobileImage from "../img/company_logos/mobile/logo-celo@2x.png";

// Horizon
import HorizonDesktopImage from "../img/company_logos/2x/logo-horizon@2x.png";
import HorizonMobileImage from "../img/company_logos/mobile/logo-horizon@2x.png";

// Instadapp
import InstadappDesktopImage from "../img/company_logos/2x/logo-instadapp@2x.png";
import InstadappMobileImage from "../img/company_logos/mobile/logo-instadapp@2x.png";

// Lodestar
import LodestarDesktopImage from "../img/company_logos/2x/logo-Lodestar@2x.png";
import LodestarMobileImage from "../img/company_logos/mobile/logo-Lodestar@2x.png";

// Melon
import MelonDesktopImage from "../img/company_logos/2x/logo-melon@2x.png";
import MelonMobileImage from "../img/company_logos/mobile/logo-melon@2x.png";

// Moloch Dao
import MolochDesktopImage from "../img/company_logos/2x/logo-molochdao@2x.png";
import MolochMobileImage from "../img/company_logos/mobile/logo-molochdao@2x.png";

// M Stable
import MStableDesktopImage from "../img/company_logos/2x/logo-mstable@2x.png";
import MStableMobileImage from "../img/company_logos/mobile/logo-mstable@2x.png";

// My Crypto
import MyCryptoDesktopImage from "../img/company_logos/2x/logo-mycrypto@2x.png";
import MyCryptoMobileImage from "../img/company_logos/mobile/logo-mycrypto@2x.png";

// Open GSN
import OpenGSNDesktopImage from "../img/company_logos/2x/logo-OpenGSN@2x.png";
import OpenGSNMobileImage from "../img/company_logos/mobile/logo-OpenGSN@2x.png";

// Open Zeppelin
import OpenZeppelinDesktopImage from "../img/company_logos/2x/logo-openzeppelin@2x.png";
import OpenZeppelinMobileImage from "../img/company_logos/mobile/logo-openzeppelin@2x.png";

// Optimism
import OptimismDesktopImage from "../img/company_logos/2x/logo-Optimism@2x.png";
import OptimismMobileImage from "../img/company_logos/mobile/logo-Optimism@2x.png";

// Opyn
import OpynDesktopImage from "../img/company_logos/2x/logo-Opyn@2x.png";
import OpynMobileImage from "../img/company_logos/mobile/logo-Opyn@2x.png";

// PieDao
import PieDaoDesktopImage from "../img/company_logos/2x/logo-pieado@2x.png";
import PieDaoMobileImage from "../img/company_logos/mobile/logo-pieado@2x.png";

// Poap
import PoapDesktopImage from "../img/company_logos/2x/logo-poap@2x.png";
import PoapMobileImage from "../img/company_logos/mobile/logo-poap@2x.png";

// Status
import StatusDesktopImage from "../img/company_logos/2x/logo-Status@2x.png";
import StatusMobileImage from "../img/company_logos/mobile/logo-Status@2x.png";

// UMA
import UmaDesktopImage from "../img/company_logos/2x/logo-uma@2x.png";
import UmaMobileImage from "../img/company_logos/mobile/logo-uma@2x.png";

// Unlock
import UnlockDesktopImage from "../img/company_logos/2x/logo-unlock@2x.png";
import UnlockMobileImage from "../img/company_logos/mobile/logo-unlock@2x.png";

export default {
  name: "HHWhosUsingHardhat",
  data() {
    // TODO-HH: Verify that these are correct and complete
    return {
      users: [
        {
          company: "Decentraland",
          href: "https://decentraland.org/",
          desktopImage: DecentralandDesktopImage,
          mobileImage: DecentralandMobileImage,
        },
        {
          company: "Connext",
          image_filename: "company_logos/mobile/logo-connext@2x.png",
          href: "https://connext.network/",
          desktopImage: ConnextDesktopImage,
          mobileImage: ConnextMobileImage,
        },
        {
          company: "Aragon One",
          image_filename: "company_logos/mobile/logo-aone@2x.png",
          href: "https://aragon.one/",
          desktopImage: AragonDesktopImage,
          mobileImage: AragonMobileImage,
        },
        {
          company: "Kyber Network",
          image_filename: "company_logos/mobile/logo-kyber@2x.png",
          href: "https://kyber.network/",
          desktopImage: KyberDesktopImage,
          mobileImage: KyberMobileImage,
        },
        {
          company: "AAVE",
          image_filename: "company_logos/mobile/logo-aave@2x.png",
          href: "#",
          desktopImage: AaveDesktopImage,
          mobileImage: AaveMobileImage,
        },
        {
          company: "Synthetix",
          image_filename: "company_logos/mobile/logo-synthetix@2x.png",
          href: "#",
          desktopImage: SynthetixDesktopImage,
          mobileImage: SynthetixMobileImage,
        },
        {
          company: "PoolTogether",
          image_filename: "company_logos/mobile/logo-pool@2x.png",
          href: "#",
          desktopImage: PoolTogetherDesktopImage,
          mobileImage: PoolTogetherMobileImage,
        },
        {
          company: "Celer",
          image_filename: "company_logos/mobile/logo-celer@2x.png",
          href: "https://www.celer.network/",
          desktopImage: CelerDesktopImage,
          mobileImage: CelerMobileImage,
        },
        {
          company: "Skale",
          image_filename: "company_logos/mobile/logo-skale@2x.png",
          href: "https://skale.network/",
          desktopImage: SkaleDesktopImage,
          mobileImage: SkaleMobileImage,
        },
        // SECOND LINE
        {
          company: "Set",
          image_filename: "company_logos/mobile/logo-set@2x.png",
          href: "#",
          desktopImage: SetDesktopImage,
          mobileImage: SetMobileImage,
        },
        {
          company: "InstaDapp",
          image_filename: "company_logos/mobile/logo-instadapp@2x.png",
          href: "#",
          desktopImage: InstadappDesktopImage,
          mobileImage: InstadappMobileImage,
        },
        {
          company: "Kleros",
          image_filename: "company_logos/mobile/logo-kleros@2x.png",
          href: "#",
          desktopImage: KlerosDesktopImage,
          mobileImage: KlerosMobileImage,
        },
        {
          company: "Balancer",
          image_filename: "company_logos/mobile/logo-Balancer@2x.png",
          href: "#",
          desktopImage: BalancerDesktopImage,
          mobileImage: BalancerMobileImage,
        },
        {
          company: "MyCrypto",
          image_filename: "company_logos/mobile/logo-mycrypto@2x.png",
          href: "#",
          desktopImage: MyCryptoDesktopImage,
          mobileImage: MyCryptoMobileImage,
        },
        {
          company: "Horizon",
          image_filename: "company_logos/mobile/logo-horizon@2x.png",
          href: "#",
          desktopImage: HorizonDesktopImage,
          mobileImage: HorizonMobileImage,
        },
        {
          company: "Lodestar",
          image_filename: "company_logos/mobile/logo-Lodestar@2x.png",
          href: "#",
          desktopImage: LodestarDesktopImage,
          mobileImage: LodestarMobileImage,
        },
        {
          company: "mStable",
          image_filename: "company_logos/mobile/logo-mstable@2x.png",
          href: "#",
          desktopImage: MStableDesktopImage,
          mobileImage: MStableMobileImage,
        },
        {
          company: "Melon",
          image_filename: "company_logos/mobile/logo-melon@2x.png",
          href: "#",
          desktopImage: MelonDesktopImage,
          mobileImage: MelonMobileImage,
        },
        {
          company: "Moloch Dao",
          image_filename: "company_logos/mobile/logo-molochdao@2x.png",
          href: "#",
          desktopImage: MolochDesktopImage,
          mobileImage: MolochMobileImage,
        },
        {
          company: "Celo",
          image_filename: "company_logos/mobile/logo-celo@2x.png",
          href: "#",
          desktopImage: CeloDesktopImage,
          mobileImage: CeloMobileImage,
        },
        // THIRD LINE
        {
          company: "UMA",
          image_filename: "company_logos/mobile/logo-uma@2x.png",
          href: "#",
          desktopImage: UmaDesktopImage,
          mobileImage: UmaMobileImage,
        },
        {
          company: "OpenGSN",
          image_filename: "company_logos/mobile/logo-OpenGSN@2x.png",
          href: "#",
          desktopImage: OpenGSNDesktopImage,
          mobileImage: OpenGSNMobileImage,
        },
        {
          company: "OpenZeppelin",
          image_filename: "company_logos/mobile/logo-openzeppelin@2x.png",
          href: "#",
          desktopImage: OpenZeppelinDesktopImage,
          mobileImage: OpenZeppelinMobileImage,
        },
        {
          company: "Optimism",
          image_filename: "company_logos/mobile/logo-Optimism@2x.png",
          href: "#",
          desktopImage: OptimismDesktopImage,
          mobileImage: OptimismMobileImage,
        },
        {
          company: "Opyn",
          image_filename: "company_logos/mobile/logo-Opyn@2x.png",
          href: "#",
          desktopImage: OpynDesktopImage,
          mobileImage: OpynMobileImage,
        },
        {
          company: "PieDao",
          image_filename: "company_logos/mobile/logo-pieado@2x.png",
          href: "#",
          desktopImage: PieDaoDesktopImage,
          mobileImage: PieDaoMobileImage,
        },
        {
          company: "POAP",
          image_filename: "company_logos/mobile/logo-poap@2x.png",
          href: "#",
          desktopImage: PoapDesktopImage,
          mobileImage: PoapMobileImage,
        },
        {
          company: "Status",
          image_filename: "company_logos/mobile/logo-Status@2x.png",
          href: "#",
          desktopImage: StatusDesktopImage,
          mobileImage: StatusMobileImage,
        },
        {
          company: "Unlock",
          image_filename: "company_logos/mobile/logo-unlock@2x.png",
          href: "#",
          desktopImage: UnlockDesktopImage,
          mobileImage: UnlockMobileImage,
        },
      ],
    };
  },
  computed: {
    desktopUsers() {
      return splitInChunks(this.users, 10);
    },
    mobileUsers() {
      return splitInChunks(this.users, 6);
    },
  },
};

function splitInChunks(arr, chunkSize) {
  return new Array(Math.ceil(arr.length / chunkSize))
    .fill()
    .map((_, i) => arr.slice(i * chunkSize, i * chunkSize + chunkSize));
}
</script>

<style lang="stylus" scoped>

#whos-using-hardhat
  @media (max-width: 1000px)
    margin-bottom 120px

  .section-title
    text-align center
    margin-bottom 80px
    font-size 45px
    font-family 'ChivoBold'
    font-weight 100
    @media (max-width: 1000px)
      font-size 28px
      margin-bottom 2.5rem

  .banner-container-desktop
    @media screen and (max-width: 760px)
      display none

    :nth-child(even).marquee-container
      .marquee
        animation-direction reverse

    :nth-child(3).marquee-container
      .marquee
        animation-duration 34s
        
  .marquee-container
    overflow hidden
    
    .marquee-content
      width: 10000px
    
    .marquee
      margin-bottom 50px
      padding-left 0
      height 80px
      animation-duration 50s
      animation-name marquee
      animation-timing-function linear
      animation-iteration-count infinite
      float: left;
      
      
      @keyframes marquee
        0%
          transform: translateX(0%)

        100%
          transform: translateX(-100%)

      img
        margin 0 50px
        max-height 67px
        transition .1s ease-in-out opacity
        display inline-block

  .banner-container-mobile
    @media screen and (min-width: 760px)
      display none

    :nth-child(even).marquee-container
      .marquee
        animation-direction reverse

    .marquee
      margin-bottom 0

      img
        margin 0 20px
        height 41px
</style>
