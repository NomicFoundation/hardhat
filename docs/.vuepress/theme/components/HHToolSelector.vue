<template>
    <div
        :class="className" 
        :id="id" 
        class="tool-selector-wrapper"
        v-on:click="$emit('update-selected-tool')"
    >
        <div class="tool-selector">
            <div class="tool-icon"></div>
            <div class="tool-name">
                <span class="hardhat">Hardhat</span>
                <br>
                <span class="tool">{{tool.title}}</span>
            </div>
        </div>
        <div class="active-tool-underlay"></div>
    </div>
</template>

<script>
    export default {
        props: {
            id: {
                type: String,
                required: true
            },
            tool: {
                type: Object,
                required: true
            },
            className: {
                type: Object,
                required: true
            }
        }
    }
</script>

<style lang="stylus">
    .tool-selector-wrapper
        position relative
        height 96px
        width 198px
        margin-bottom 20px !important
        @media (max-width: 1000px)
            margin-bottom 12px !important
            width calc(335px / 2)
            height 88px
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
            @media (max-width: 1000px)
                padding 12px
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
            z-index 100
            .tool-icon
                box-shadow 0 0 10px white
                background-size 72px
                @media (max-width: 1000px)
                    background-size 50px
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
            width 162px
        &#Runner .tool-icon
            background-image url("../img/tool_icons/Hardhat-Runner.svg")
        &#Network .tool-icon
            background-image url("../img/tool_icons/Hardhat-Network.svg")
        &#Ignition .tool-icon
            background-image url("../img/tool_icons/Hardhat-Ignition.svg")
        &#Solidity .tool-icon
            background-image url("../img/tool_icons/Hardhat-Solidity.svg")
        .tool-icon
            transition-duration 0.1s
            min-width 72px
            min-height 72px
            background-size 48px
            background-position center
            background-repeat no-repeat
            border-radius 8px
            box-shadow 0 1px 2px alpha(#D4D4D4, 0.5)
            @media (max-width: 1000px)
                min-width unset
                min-height unset
                background-size 42px
                min-width 48px
                min-height 48px
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
</style>
