<template>
    <section id="tools">
        <div class="padded-container">
            <div class="tool-section-wrapper">
                <div class="tool-selection-area">
                    <div class="tool-selection-left">
                        <h2 class="tools-title">TOOLS</h2>
                        <div class="left-tools-list tools-list">
                            <div id="runner" class="tool-selector-wrapper active" @click="onToolPress">
                                <div class="tool-selector">
                                    <div class="tool-icon"></div>
                                    <div class="tool-name">
                                        <span class="hardhat">Hardhat</span>
                                        <br>
                                        <span class="tool">Runner</span>
                                    </div>
                                </div>
                                <div class="active-tool-underlay"></div>
                            </div>
                            <div id="network" class="tool-selector-wrapper" @click="onToolPress">
                                <div class="tool-selector">
                                    <div class="tool-icon"></div>
                                    <div class="tool-name">
                                        <span class="hardhat">Hardhat</span>
                                        <br>
                                        <span class="tool">Network</span>
                                    </div>
                                </div>
                                <div class="active-tool-underlay"></div>
                            </div>
                        </div>
                    </div>
                    <div class="tool-selection-right">
                        <div class="right-tools-list tools-list">
                            <div class="right-tools-list tools-list">
                                <div id="ignition" class="tool-selector-wrapper" @click="onToolPress">
                                    <div class="tool-selector">
                                        <div class="tool-icon"></div>
                                        <div class="tool-name">
                                            <span class="hardhat">Hardhat</span>
                                            <br>
                                            <span class="tool">Ignition</span>
                                        </div>
                                    </div>
                                    <div class="active-tool-underlay"></div>
                                </div>
                                <div id="solidity" class="tool-selector-wrapper" @click="onToolPress">
                                    <div class="tool-selector">
                                        <div class="tool-icon"></div>
                                        <div class="tool-name">
                                            <span class="hardhat">Hardhat</span>
                                            <br>
                                            <span class="tool">Solidity</span>
                                        </div>
                                    </div>
                                    <div class="active-tool-underlay"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="runner" class="tool-data">
                    <div class="tool-header">
                        <h3>Hardhat 
                            <span class="tool-title"></span>
                        </h3>
                        <div class="tool-tags-wrapper">
                            <span>#<span class="tool-tags"></span></span>
                            
                        </div>
                    </div>
                    <div class="tool-body">
                        <p class="tool-description"></p>
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

    export default {
        name: "HHTools",
        data() {
            return {
                currentTool: 'runner',
                tagChangeInterval: null,
                toolsData: {
                    runner: {
                        title: 'Runner',
                        details: 'Task runner that ties compiling, testing and everything else together through a simple and flexible architecture that is extended through a rich plugin ecosystem.',
                        tags: ['compile', 'test', 'extend'],
                        position: 'left'
                    },
                    ignition: {
                        title: 'Ignition',
                        details: 'Deployment system for structuring, automating and distributing smart contract deployment setups.',
                        tags: ['deploy', 'distribute'],
                        position: 'left'
                    },
                    network: {
                        title: 'Network',
                        details: 'Development network to locally deploy smart contracts. Packed with development features like Solidity console.log, stack traces, different mining modes and more.',
                        tags: ['debug', 'deploy', 'simulate'],
                        position: 'right'
                    },
                    solidity: {
                        title: 'Solidity',
                        details: 'Visual Studio Code extension for Solidity editing assistance. Code navigation, refactoring and type-smart suggestions.',
                        tags: ['code', 'refactor'],
                        position: 'right'
                    },
                }
            }
        },
        mounted() {
            this.updateSelectedTool('runner');
        },
        methods: {
            updateSelectedTool(selectedTool) {
                let currentTag = 0;
                let tags = this.toolsData[selectedTool].tags;
                let totalTags = tags.length;
                $('.tool-data').attr('id', selectedTool);

                const setElementTransition = (elClass, elHiddenClass, innerHTML, targetClass) => {
                    $(`.${elClass}`).addClass(elHiddenClass);
                    setTimeout(() => {
                        if (targetClass) {
                            $(`.${targetClass}`).html(innerHTML);
                        } else {
                            $(`.${elClass}`).html(innerHTML);
                        }
                        setTimeout(() => {
                            let width = $('.tool-tags').width();
                            $('.tool-tags-wrapper').css({
                                width: width + 32 + 'px'
                            });
                            $(`.${elClass}`).removeClass(elHiddenClass);
                        }, 100);
                    }, 100);
                };

                setElementTransition(
                    'tool-title', 
                    'tool-hidden', 
                    this.toolsData[selectedTool].title);

                setElementTransition(
                    'tool-tags-wrapper', 
                    'tags-wrapper-hidden', 
                    this.toolsData[selectedTool].tags[0], 
                    'tool-tags');

                setElementTransition(
                    'tool-description', 
                    'description-hidden', 
                    this.toolsData[selectedTool].details);

                const startTagAnimation = () => {
                    if (currentTag < totalTags - 1) {
                        currentTag += 1;
                    } else {
                        currentTag = 0;
                    };

                    $('.tool-tags').addClass('tag-hidden');
                    let tagArray = [];
                    for (let i = 0; i < tags[currentTag].length; i++) {
                        tagArray.push(tags[currentTag][i])
                    };

                    setTimeout(() => {
                        $('.tool-tags').html(
                            tagArray.map((character, i) => {
                                return (`<span class="character" style="animation-delay:${i / 15}s">${character}</span>`)
                            })
                        );
                        let width = $('.tool-tags').width();
                        $('.tool-tags-wrapper').css({
                            width: width + 32 + 'px'
                        });
                    }, 100);

                    setTimeout(() => {
                        $('.tool-tags').removeClass('tag-hidden');
                    }, 200);
                };

                clearInterval(this.tagChangeInterval);
                this.tagChangeInterval = setInterval(startTagAnimation, 1500);
            },
            onToolPress(e) {
                const toolElement = e.currentTarget;
                const selectedTool = $(toolElement).attr('id');
                this.updateSelectedTool(selectedTool);
                if (!$(toolElement).hasClass('active')) {
                    $('.active').removeClass('active');
                    $(toolElement).addClass('active');
                }
            }
        }
    };
</script>

<style lang="stylus">
    #tools
        .padded-container
            margin-top 20px
        .tool-section-wrapper 
            display flex
            height 318px
            margin-bottom 147px
            position relative
            @media (max-width: 1000px)
                flex-direction column
                height 690px
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
                    bottom 68px
                    top unset
            .tool-selection-area,
            .tool-data
                width 50%
                height 318px
                padding 40px
                @media (max-width: 1000px)
                    width 100%
            .tool-selection-area
                display grid
                grid-template-columns calc(50% - 12px) calc(50% - 12px)
                grid-template-rows auto
                grid-column-gap 24px
                position relative
                @media (max-width: 1000px)
                    grid-template-columns auto
                    grid-template-rows 96px
                    padding 0px
                    // height unset
                    height 315px
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
                    transform translateY(18px)
                    @media (max-width: 1000px)
                        transform unset
                        top unset
                        bottom 0
                        height 1px
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
                    transform translateY(16px) rotate(135deg) 
                    @media (max-width: 1000px)
                        transform translateY(0) rotate(225deg) 
                        bottom -5px
                        right calc(50% - 5px)
                        top unset
                .tool-selection-left 
                    position relative
                    .tools-title
                        font-size 18px
                        line-height 24px
                        color #0A0A0A
                        margin-bottom 24px
                        letter-spacing 4px
                        font-weight 200
                        font-family 'Chivo'
                        @media (max-width: 1000px)
                            position absolute
                            left 24px
                            font-size 20px
                    .left-tools-list
                        @media (max-width: 1000px)
                            width 100%
                            display flex
                            margin-top 56px
                            justify-content space-between
                .tool-selection-right
                    padding-top 48px
                    .right-tools-list
                        @media (max-width: 1000px)
                            display flex
                            width 100%
                            margin-top 32px
                            justify-content space-between
                            .tool-selector 
                                margin-bottom 0
                .tool-selection-left,
                .tool-selection-right
                    display flex
                    flex-direction column
                    justify-content center
                    @media (max-width: 1000px)
                        flex-direction row
                .tool-selector-wrapper
                    position relative
                    height 96px
                    width 198px
                    margin-bottom 16px
                    .tool-selector
                        border-radius 4px
                        display flex
                        height 100%
                        align-items center
                        transition 0.2s ease-in-out all
                        background white
                        padding 16px
                        cursor pointer
                        position relative
                        z-index 1
                    .active-tool-underlay
                        &:after,
                        &:before
                            content ''
                            position absolute
                            top 0
                            left 0
                            width 100%
                            height 100%
                            border-radius 4px
                            box-shadow 0 0 0 white
                            transition ease-in-out 0.3s box-shadow
                    &.active
                        .tool-icon
                            box-shadow 0 0 10px white
                            background-size 72px
                            @media (max-width: 1000px)
                                background-size 64px
                        .active-tool-underlay
                            position absolute
                            background gray
                            width 100%
                            height 100%
                            top 0
                            left 0
                            border-radius 4px
                            &:after
                                box-shadow -6px 2px 10px #FBFCDB
                            &:before
                                box-shadow 6px -2px 10px #EEE3FF
                    @media (max-width: 1000px)
                        width calc(50% - 9px)
                    &#runner .tool-icon
                        background-image url("../img/tool_icons/Hardhat-Runner.svg")
                    &#network .tool-icon
                        background-image url("../img/tool_icons/Hardhat-Network.svg")
                    &#ignition .tool-icon
                        background-image url("../img/tool_icons/Hardhat-Ignition.svg")
                    &#solidity .tool-icon
                        background-image url("../img/tool_icons/Hardhat-Solidity.svg")
                    .tool-icon
                        transition-duration 0.1s
                        min-width 72px
                        min-height 72px
                        background-size 56px
                        background-position center
                        background-repeat no-repeat
                        border-radius 8px
                        box-shadow 0 1px 2px alpha(#D4D4D4, 0.5)
                        @media (max-width: 1000px)
                            min-width unset
                            min-height unset
                            min-width 64px
                            min-height 64px
                    .tool-name
                        margin-left 16px
                        .hardhat,
                        .tool
                            font-family 'ChivoLight'
                            font-size 18px
                            color #6E6F70
                            font-weight 800
                            @media (max-width: 1000px)
                                font-size 14px
                        .tool
                            color #0A0A0A
                            height 24px
                            line-height 24px
                            @media (max-width: 1000px)
                                font-size 15px
            .tool-data
                padding 64px 50px 
                @media (max-width: 1000px)
                    padding 0 24px 
                    margin-top 40px
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
                        transition 0.2s ease-in-out all
                        opacity 1
                        white-space nowrap
                        color #6E6F70 !important
                        span
                            color #6E6F70 !important
                            font-weight 600
                        &.tags-wrapper-hidden
                            opacity 0
                        .tool-tags
                            transition 0.1s ease-in-out all
                            span.character
                                opacity 0
                                position relative
                                display inline-block
                                color #6E6F70 !important
                                animation fadeInTag 1s ease-out forwards
                            &.tag-hidden
                                opacity 0
                        @keyframes fadeInTag
                            0% 
                                opacity: 0;
                            10%
                                opacity: 1;
                            95%
                                opacity: 1;
                            100%
                                opacity: 0;
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
                            height 136px
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
                &#runner .tool-header .tool-tags-wrapper
                    background-color #F8F4CB
                &#network .tool-header .tool-tags-wrapper
                    background-color #F6EDD1
                &#ignition .tool-header .tool-tags-wrapper
                    background-color #F3ECF3
                &#solidity .tool-header .tool-tags-wrapper
                    background-color #F0E7FB
                
</style>
