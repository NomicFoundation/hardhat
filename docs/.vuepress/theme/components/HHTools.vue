<template>
    <section 
        id="tools" 
        :class="{
            large: toolDisplayNumber > 4,
            small: toolDisplayNumber <= 3,
        }"
        @mouseover="onToolAreaHover"
        @mouseleave="onToolAreaLeave"
    >
        <div class="padded-container">
            <div 
                class="tool-section-wrapper" 
                :class="{
                    [`list-${toolDisplayNumber || toolsData.length}-items`]: true
                }"
            >
                <div class="tool-selection-area">
                    <h2 class="tools-title">TOOLS</h2>
                    <div class="tools-list">
                        <div
                            v-for="column in ['left','right']"
                            :key="column"
                            :class="`tools-column ${column}-tools-column`"
                        >
                            <HHToolSelector 
                                v-for="(tool, index) in toolsData" 
                                v-on:update-selected-tool="() => {onToolPress(index)}"
                                :key="index"
                                v-if="tool.position == column && index < toolDisplayNumber"
                                :tool="tool"
                                :id="tool.title"
                                :className="{
                                    active: currentTool == index, 
                                    left: tool.position == 'left',
                                    right: tool.position == 'right'
                                }"
                            />
                        </div>
                    </div>
                </div>
                <div :id="toolsData[currentTool].title" class="tool-data">
                    <div class="tool-header">
                        <h3>Hardhat
                            <span class="tool-title">{{toolsData[currentTool].title}}</span>
                        </h3>
                        <div class="tool-tags-wrapper">
                            <span>#
                                <span class="tool-tags" ref="toolTag">
                                    {{toolsData[currentTool].tags[currentTagIndex]}}
                                </span>
                            </span>
                        </div>
                    </div>
                    <div class="tool-body">
                        <p class="tool-description">
                            {{toolsData[currentTool].details}}
                        </p>
                        <div class="learn-more-wrapper">
                            <a class="learn-more-link" href="#"> 
                                Learn more
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
    import $ from 'jquery';
    import HHToolSelector from "./HHToolSelector";
    
    export default {
        name: "HHTools",
        components: { HHToolSelector },
        data() {
            return {
                toolAreaHovered: false,
                currentTagIndex: 0,
                tagChangeInterval: null,
                toolChangeInterval: null,
                tagAnimationTimer: 2,
                toolChangeTimer: 2,
                toolDisplayNumber: this.$route.query.tools ? this.$route.query.tools : 4,
                tagSwitchRound: 1,
                toolsData: [
                    {
                        title: 'Runner',
                        details: 'Task runner that ties compiling, testing and everything else together through a simple and flexible architecture that is extended through a rich plugin ecosystem.',
                        tags: ['compile', 'test', 'extend'],
                        position: 'left'
                    },
                    {
                        title: 'Ignition',
                        details: 'Deployment system for structuring, automating and distributing smart contract deployment setups.',
                        tags: ['deploy', 'distribute'],
                        position: 'left'
                    },
                    {
                        title: 'Network',
                        details: 'Development network to locally deploy smart contracts. Packed with development features like Solidity console.log, stack traces, different mining modes and more.',
                        tags: ['debug', 'deploy', 'simulate'],
                        position: 'right'
                    },
                    {
                        title: 'Solidity',
                        details: 'Visual Studio Code extension for Solidity editing assistance. Code navigation, refactoring and type-smart suggestions.',
                        tags: ['code', 'refactor'],
                        position: 'right'
                    },
                    {
                        title: 'Network',
                        details: 'Visual Studio Code extension for Solidity editing assistance. Code navigation, refactoring and type-smart suggestions.',
                        tags: ['code', 'refactor'],
                        position: 'right'
                    },
                ],
                currentTool: 0,
            }
        },
        mounted() {
            this.updateSelectedTool(0);
            // Switch position of tool according to amount
            if (this.toolsData.length == 3 || this.toolDisplayNumber == 3) {
                this.toolsData[1].position = 'right';
            };
            
            this.tagChangeInterval = setInterval(() => {
                this.onTagChangeInterval(this)
            }, this.tagAnimationTimer * 1000);

            this.toolChangeInterval = setInterval(() => {
                this.onToolChangeInterval(this);
            }, (((this.tagAnimationTimer * this.toolsData[this.currentTool].tags.length) * 2 ) * 1000));
        },
        destroyed() {
            clearInterval(this.tagChangeInterval);
            clearInterval(this.toolChangeInterval);
        },
        methods: {
            resetTagCounter() {
                this.currentTagIndex = 0;
            },
            onTagChangeInterval(that) {
                const totalTags = that.toolsData[that.currentTool].tags.length;
                let hiddenClass = 'tag-hidden';

                this.$refs.toolTag.classList.add(hiddenClass);

                setTimeout(() => {
                    if (that.currentTagIndex == totalTags - 1) {
                        this.resetTagCounter();
                    } else {
                        that.currentTagIndex = that.currentTagIndex + 1;
                    };
                }, 100);
                
                setTimeout(() => {
                    this.$refs.toolTag.classList.remove(hiddenClass);
                }, 200);

            },
            onToolChangeInterval(that) {
                if (that.currentTool == that.toolDisplayNumber - 1) {
                    that.currentTool = 0;
                } else {
                    that.currentTool = that.currentTool + 1;
                }

                clearInterval(this.tagChangeInterval);
                clearInterval(this.toolChangeInterval);

                this.resetTagCounter();
                this.toolChangeInterval = setInterval(() => {
                    this.onToolChangeInterval(this);
                }, (((this.tagAnimationTimer * this.toolsData[this.currentTool].tags.length) * 2 ) * 1000));

                this.tagChangeInterval = setInterval(() => {
                    this.onTagChangeInterval(this);
                }, this.tagAnimationTimer * 1000);
            },
            updateSelectedTool(selectedTool) {
                this.resetTagCounter();
                this.currentTool = selectedTool;
            },
            onToolPress(indexOfPressedTool) {
                this.updateSelectedTool(indexOfPressedTool);
            },
            onToolAreaHover() {
                // console.log('Interval interrumpted');
                clearInterval(this.toolChangeInterval);
                // clearInterval(this.tagChangeInterval);
            },
            onToolAreaLeave() {
                setTimeout(() => {
                    clearInterval(this.tagChangeInterval);
                    this.toolChangeInterval = setInterval(() => {
                        this.onToolChangeInterval(this);
                    }, (((this.tagAnimationTimer * this.toolsData[this.currentTool].tags.length) * 2 ) * 1000));

                    this.tagChangeInterval = setInterval(() => {
                        this.onTagChangeInterval(this);
                    }, this.tagAnimationTimer * 1000);
                }, 2000);
            }
        }
    };
</script>

<style lang="stylus">
    #tools
        @media screen and (max-width: 1000px)
            margin-bottom 110px
        &.large 
            .tool-section-wrapper,
            .tool-data
                height 382px !important
                @media (max-width: 1000px)
                    height 656px !important
        &.small
            .tool-section-wrapper,
            .tool-data
                height 272px !important
            .tool-selection-area
                height 224px !important
                &:before
                    height 175px !important
                    top calc(50% - (175px / 2)) !important
        .padded-container
            margin-top 20px
        .tool-section-wrapper 
            display flex
            height 318px
            margin-bottom 147px
            position relative
            &.list-4-items
                @media (max-width: 1000px)
                    &:after
                        bottom -24px !important
            &.list-5-items
                height 351px
                &:after
                    bottom 0
                .right-tools-column
                    position relative
                    bottom 56px
                .tool-selection-area
                    @media (max-width: 1000px)
                        width 100% !important
                        height 320px
                        padding 0
                .tool-data
                    @media (max-width: 1000px)
                        height 263px !important
            &.list-3-items
                &:after
                    bottom -12px
                @media (max-width: 1000px)
                    height 551px !important
                    .left-tools-column
                        top 16px !important
                .left-tools-column
                    position relative
                    top 56px
                .right-tools-column
                    position relative
                    bottom 60px
            @media (max-width: 1000px)
                flex-direction column
                height 590px
                margin-bottom 8px
            &:before,
            &:after
                content ''
                position absolute
                width 36px
                height 100%
                background white
                border-top 1px solid #D4D4D4
                border-left 1px solid #D4D4D4
                border-bottom 1px solid #D4D4D4
                top 0
                @media (max-width: 1000px)
                    border-right 1px solid #D4D4D4
                    border-left 0
                    border-bottom 0
                    height 32px
                    width 100%
            &:before
                @media (max-width: 1000px)
                    top -32px
            &:after
                right 0 
                transform rotate(180deg);
                @media (max-width: 1000px)
                    bottom 40px
                    top unset
            .tool-selection-area,
            .tool-data
                height 318px
                padding 40px
                @media (max-width: 1000px)
                    width 100% !important
            .tool-selection-area
                height 100%
                position relative
                width 500px
                @media (max-width: 1000px)
                    padding 0
                    height 280px
                &:before,
                &:after
                    content ''
                    position absolute
                &:before 
                    right 0
                    top calc(50% - 232px / 2)
                    height 232px
                    width 1px
                    background #E5E5E5
                    @media (max-width: 1000px)
                        transform unset
                        top unset !important
                        bottom 0 !important
                        height 1px !important
                        width 172px
                        left calc(50% - 172px / 2)
                &:after
                    width 10px
                    height 10px
                    background white
                    border-top 1px solid #E5E5E5
                    border-left 1px solid #E5E5E5
                    right -5px
                    top calc(50% - 5px)
                    transform rotate(135deg) 
                    @media (max-width: 1000px)
                        transform translateY(0) rotate(225deg) 
                        bottom -5px
                        right calc(50% - 5px)
                        top unset
                .tools-title
                    font-size 18px
                    line-height 24px
                    color #0A0A0A
                    margin-bottom 24px
                    letter-spacing 4px
                    font-weight 200
                    font-family 'Chivo'
                    @media (max-width: 1000px)
                        font-size 20px
                .tools-list
                    display flex
                    @media (max-width: 1000px)
                        padding 0px
                        height 236px
                        justify-content space-around
                    .tools-column
                        @media (max-width: 1000px)
                            width calc(335px / 2)
                        &.left-tools-column
                            margin-right 32px
                            @media (max-width: 1000px)
                                margin-right 0
                                margin-left 4px
            .tool-data
                padding 0 50px 
                width 458px
                display flex
                flex-direction column
                justify-content center
                @media (max-width: 1000px)
                    padding 0 24px 
                    margin-top 40px
                    height 260px !important
                .tool-header
                    font-family 'Chivo'
                    display flex
                    align-items center
                    margin-bottom 30px
                    h3
                        font-size 24px
                        color #6E6F70
                        white-space nowrap
                        @media (max-width: 1000px)
                            font-size 24px
                        .tool-title
                            transition 0.1s ease-in-out all
                            opacity 1
                            &.title-hidden
                                opacity 0
                    .tool-tags-wrapper
                        font-size 13px
                        text-transform uppercase
                        height 27px
                        margin-left 24px
                        line-height 27px
                        padding 0 12px
                        border-radius 8px 0 8px 0
                        letter-spacing 1px
                        font-family 'Chivo'
                        opacity 1
                        white-space nowrap
                        color #6E6F70 !important
                        span
                            color #6E6F70 !important
                            font-weight 600
                        .tool-tags
                            transition 0.1s ease-in-out opacity
                        .tool-tags.tag-hidden
                            opacity 0
                .tool-body
                    .tool-description
                        font-size 15px
                        color #6E6F70
                        line-height 28px
                        margin-bottom 24px
                        height 112px
                        transition 0.1s ease-in-out all
                        opacity 1
                        width 366px
                        font-weight 100
                        font-family 'ChivoLight'
                        @media (max-width: 1000px)
                            width 100%
                            font-size 18px
                            height 160px
                        &.description-hidden
                            opacity 0
                    .learn-more-link
                        color #6E6F70
                        font-family 'Chivo'
                        position relative
                        transition ease-in-out 0.1s all
                        &:hover
                            color #0A0A0A
                            &:after
                                right -24px
                                border-color #0A0A0A
                        &:after
                            content ''
                            position absolute
                            width 7px
                            height 7px
                            background white
                            border-top 1px solid #6E6F70
                            border-left 1px solid #6E6F70
                            right -18px
                            top calc(50% - 3px)
                            transform rotate(135deg)
                            transition ease-in-out 0.1s all
                &#Runner .tool-header .tool-tags-wrapper
                    background-color #F8F4CB
                &#Network .tool-header .tool-tags-wrapper
                    background-color #F6EDD1
                &#Ignition .tool-header .tool-tags-wrapper
                    background-color #F3ECF3
                &#Solidity .tool-header .tool-tags-wrapper
                    background-color #F0E7FB
                
</style>
