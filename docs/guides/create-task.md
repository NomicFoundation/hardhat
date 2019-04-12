---
prev: '/guides/'
next: 'truffle-migration'
---

# Creating a task

In this guide, we will explore the creation of tasks in Buidler, which are the core component used for automation. For a general overview of using Buidler refer to the [Getting started guide](https://medium.com/nomic-labs-blog/how-to-get-started-with-buidler-68beb6b9bb04).

## **What exactly are tasks in Buidler?**

Everything you can do in Buidler is defined as a task. The default actions that come out of the box are built-in tasks and they are implemented using the same APIs that are available to you as a user.

![](https://cdn-images-1.medium.com/max/1600/1*6Hs6BHNc-aBBrlzu_GBevw.png)  

As some examples, you could create a task to reset the state of a development environment, interact with your contracts or package your project.

Let’s go through the process of creating one to interact with a smart contract.

Tasks in Buidler are asynchronous JavaScript functions that get access to the [Buidler Runtime Environment](https://github.com/nomiclabs/buidler/blob/new-readme/README.md#Buidler-Runtime-Environment), through which you get access to the configuration, parameters, programmatic access to other tasks and any objects plugins may have injected.

For our example we will use Web3.js to interact with our contracts, so we will install the [web3 plugin](https://github.com/nomiclabs/buidler-web3), which injects a Web3 instance into the Buidler environment:

`npm install @nomiclabs/buidler-web3 web3@1.0.0-beta.37`

*Take a look at the [list of Buidler plugins](https://github.com/nomiclabs/buidler#Plugins) to see other available libraries.*

We will require the plugin and add our task creation code to the Buidler configuration file, which is always executed on startup before anything else happens. It’s a good place to create simple tasks. If your task is more complex, you can put it in a separate file and require it, or if you’re writing a Buidler plugin that adds a task, you can create it from a separate npm package. Learn more about creating tasks through plugins in our [How to create a plugin guide](https://medium.com/nomic-labs-blog/how-to-create-a-buidler-plugin-b60432bf6d75).

Let’s create a task to get an account’s balance from the terminal. You can do this with the Buidler’s config DSL, which is available in the global scope of `buidler.config.js`:

After saving the file, you should already be able to see the task in Buidler:

![](https://cdn-images-1.medium.com/max/1600/1*YI86NhKsljGf6u0zSCoGRA.png)

Now let’s implement the functionality we want. We need to get the account address from the user. We can do this by adding a parameter to our task:

When you add a parameter to a task, Buidler will handle its help messages for you:

![](https://cdn-images-1.medium.com/max/1600/1*JxpDYfaZutArBmKdOWt4fg.png)

Let’s now get the account’s balance. The [Buidler Runtime Environment](https://github.com/nomiclabs/buidler#Buidler-Runtime-Environment) will be available in the global scope. By using Buidler’s [web3 plugin](https://github.com/nomiclabs/buidler-web3) we get access to a web3 instance:

Finally, we can run it:

![](https://cdn-images-1.medium.com/max/1600/1*N2ivLG4RFHLv-C2LM8AU_w.png)

And there you have it. Your first fully functional Buidler task, allowing you to interact with the Ethereum blockchain in an easy way.

For any questions or feedback you may have, you can find us in the [Buidler Support Telegram group](http://t.me/BuidlerSupport).