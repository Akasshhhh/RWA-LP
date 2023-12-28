import { BigNumber, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import styles from "../styles/Home.module.css";
import lp from "../assets/lp.png";
import { addLiquidity, calculateCD } from "../utils/addLiquidity";
import {
  getCDTokensBalance,
  getEtherBalance,
  getLPTokensBalance,
  getReserveOfCDTokens,
} from "../utils/getAmounts";
import {
  getTokensAfterRemove,
  removeLiquidity,
} from "../utils/removeLiquidity";
import Image from "next/image";

export default function Home() {

  const [valueOfCoin, setCoin] = useState("RUSD");

  /** General state variables */
  // loading is set to true when the transaction is mining and set to false when
  // the transaction has mined
  const [loading, setLoading] = useState(false);
  // We have two tabs in this dapp, Liquidity Tab and Swap Tab. This variable
  // keeps track of which Tab the user is on. If it is set to true this means
  // that the user is on `liquidity` tab else he is on `swap` tab
  const [liquidityTab, setLiquidityTab] = useState(true);
  // This variable is the `0` number in form of a BigNumber
  const zero = BigNumber.from(0);
  /** Variables to keep track of amount */
  // `ethBalance` keeps track of the amount of Eth held by the user's account
  const [ethBalance, setEtherBalance] = useState(zero);
  // `reservedCD` keeps track of the Crypto Dev tokens Reserve balance in the Exchange contract
  const [reservedCD, setReservedCD] = useState(zero);
  // Keeps track of the ether balance in the contract
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
  // cdBalance is the amount of `CD` tokens help by the users account
  const [cdBalance, setCDBalance] = useState(zero);
  // `lpBalance` is the amount of LP tokens held by the users account
  const [lpBalance, setLPBalance] = useState(zero);
  /** Variables to keep track of liquidity to be added or removed */
  // addEther is the amount of Ether that the user wants to add to the liquidity
  const [addEther, setAddEther] = useState(zero);
  // addCDTokens keeps track of the amount of CD tokens that the user wants to add to the liquidity
  // in case when there is no initial liquidity and after liquidity gets added it keeps track of the
  // CD tokens that the user can add given a certain amount of ether
  const [addCDTokens, setAddCDTokens] = useState(zero);
  // removeEther is the amount of `Ether` that would be sent back to the user based on a certain number of `LP` tokens
  const [removeEther, setRemoveEther] = useState(zero);
  // removeCD is the amount of `Crypto Dev` tokens that would be sent back to the user based on a certain number of `LP` tokens
  // that he wants to withdraw
  const [removeCD, setRemoveCD] = useState(zero);
  // amount of LP tokens that the user wants to remove from liquidity
  const [removeLPTokens, setRemoveLPTokens] = useState("0");
  /** Variables to keep track of swap functionality */
  // Amount that the user wants to swap
  const [swapAmount, setSwapAmount] = useState("");
  // This keeps track of the number of tokens that the user would receive after a swap completes
  const [tokenToBeReceivedAfterSwap, settokenToBeReceivedAfterSwap] = useState(
    zero
  );
  // Keeps track of whether  `Eth` or `Crypto Dev` token is selected. If `Eth` is selected it means that the user
  // wants to swap some `Eth` for some `Crypto Dev` tokens and vice versa if `Eth` is not selected
  const [ethSelected, setEthSelected] = useState(true);
  /** Wallet connection */
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  /**
   * getAmounts call various functions to retrive amounts for ethbalance,
   * LP tokens etc
   */
  const getAmounts = async () => {
    try {
      const provider = await getProviderOrSigner(false);
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      // get the amount of eth in the user's account
      const _ethBalance = await getEtherBalance(provider, address);
      // get the amount of `Crypto Dev` tokens held by the user
      const _cdBalance = await getCDTokensBalance(provider, address);
      // get the amount of `Crypto Dev` LP tokens held by the user
      const _lpBalance = await getLPTokensBalance(provider, address);
      // gets the amount of `CD` tokens that are present in the reserve of the `Exchange contract`
      const _reservedCD = await getReserveOfCDTokens(provider);
      // Get the ether reserves in the contract
      const _ethBalanceContract = await getEtherBalance(provider, null, true);
      setEtherBalance(_ethBalance);
      setCDBalance(_cdBalance);
      setLPBalance(_lpBalance);
      setReservedCD(_reservedCD);
      setReservedCD(_reservedCD);
      setEtherBalanceContract(_ethBalanceContract);
    } catch (err) {
      console.error(err);
    }
  };

  /**** SWAP FUNCTIONS ****/

  /**
   * swapTokens: Swaps  `swapAmountWei` of Eth/Crypto Dev tokens with `tokenToBeReceivedAfterSwap` amount of Eth/Crypto Dev tokens.
   */

  /**
   * _getAmountOfTokensReceivedFromSwap:  Returns the number of Eth/Crypto Dev tokens that can be received 
   * when the user swaps `_swapAmountWEI` amount of Eth/Crypto Dev tokens.
   */


  /*** END ***/

  /**** ADD LIQUIDITY FUNCTIONS ****/

  /**
   * _addLiquidity helps add liquidity to the exchange,
   * If the user is adding initial liquidity, user decides the ether and CD tokens he wants to add
   * to the exchange. If he is adding the liquidity after the initial liquidity has already been added
   * then we calculate the crypto dev tokens he can add, given the Eth he wants to add by keeping the ratios
   * constant
   */
  const _addLiquidity = async () => {
    try {
      // Convert the ether amount entered by the user to Bignumber
      const addEtherWei = utils.parseEther(addEther.toString());
      // Check if the values are zero
      if (!addCDTokens.eq(zero) && !addEtherWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        // call the addLiquidity function from the utils folder
        await addLiquidity(signer, addCDTokens, addEtherWei);
        setLoading(false);
        // Reinitialize the CD tokens
        setAddCDTokens(zero);
        // Get amounts for all values after the liquidity has been added
        await getAmounts();
      } else {
        setAddCDTokens(zero);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAddCDTokens(zero);
    }
  };

  /**** END ****/

  /**** REMOVE LIQUIDITY FUNCTIONS ****/

  /**
   * _removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
   * liquidity and also the calculated amount of `ether` and `CD` tokens
   */
  const _removeLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);
      // Call the removeLiquidity function from the `utils` folder
      await removeLiquidity(signer, removeLPTokensWei);
      setLoading(false);
      await getAmounts();
      setRemoveCD(zero);
      setRemoveEther(zero);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setRemoveCD(zero);
      setRemoveEther(zero);
    }
  };

  /**
   * _getTokensAfterRemove: Calculates the amount of `Ether` and `CD` tokens
   * that would be returned back to user after he removes `removeLPTokenWei` amount
   * of LP tokens from the contract
   */
  const _getTokensAfterRemove = async (_removeLPTokens) => {
    try {
      const provider = await getProviderOrSigner();
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokenWei = utils.parseEther(_removeLPTokens);
      // Get the Eth reserves within the exchange contract
      const _ethBalance = await getEtherBalance(provider, null, true);
      // get the crypto dev token reserves from the contract
      const cryptoDevTokenReserve = await getReserveOfCDTokens(provider);
      // call the getTokensAfterRemove from the utils folder
      const { _removeEther, _removeCD } = await getTokensAfterRemove(
        provider,
        removeLPTokenWei,
        _ethBalance,
        cryptoDevTokenReserve
      );
      setRemoveEther(_removeEther);
      setRemoveCD(_removeCD);
    } catch (err) {
      console.error(err);
    }
  };

  /**** END ****/

  /**
   * connectWallet: Connects the MetaMask wallet
   */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or
   * without the signing capabilities of Metamask attached
   *
   * A `Provider` is needed to interact with the blockchain - reading
   * transactions, reading balances, reading state, etc.
   *
   * A `Signer` is a special type of Provider used in case a `write` transaction
   * needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being
   * sent. Metamask exposes a Signer API to allow your website to request
   * signatures from the user using Signer functions.
   *
   * @param {*} needSigner - True if you need the signer, default false
   * otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 152) {
      window.alert("Change the network to RedbellyDevNet");
      throw new Error("Change network to RedbellyDevNet");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes - this effect will be called
  useEffect(() => {
    // if wallet is not connected, create a new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      // Assign the Web3Modal class to the reference object by setting it's `current` value
      // The `current` value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "goerli",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getAmounts();
    } else {
      getAmounts();
    }
  }, [walletConnected]);

  /*
      renderButton: Returns a button based on the state of the dapp
  */
  const renderButton = () => {
    // If wallet is not connected, return a button which allows them to connect their wllet
    // If we are currently waiting for something, return a loading button

    return (
      <div>
        <div>
          {(
            <div>
              <input
                type="number"
                placeholder="Amount of RBNT"
                onChange={async (e) => {
                  setAddEther(e.target.value || "0");
                  // calculate the number of CD tokens that
                  // can be added given  `e.target.value` amount of Eth
                  const _addCDTokens = await calculateCD(
                    e.target.value || "0",
                    etherBalanceContract,
                    reservedCD
                  );
                  setAddCDTokens(_addCDTokens);
                }}
                className=" mt-4 ml-8 font-semibold px-6 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 outline-none appearance-none"
              />
              <div className={styles.inputDiv}>
                {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                {`You will need ${utils.formatEther(addCDTokens)} RUSD Tokens`}
              </div>
              <button className={styles.button1} onClick={_addLiquidity}>
                Add
              </button>
            </div>
          )}
          <div>
            <input
              type="number"
              placeholder="Amount of LP Tokens"
              onChange={async (e) => {
                setRemoveLPTokens(e.target.value || "0");
                // Calculate the amount of Ether and CD tokens that the user would receive
                // After he removes `e.target.value` amount of `LP` tokens
                await _getTokensAfterRemove(e.target.value || "0");
              }}
              className={styles.input}
            />
            <div className={styles.inputDiv}>
              {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
              {`You will get ${utils.formatEther(removeCD)} RUSD and ${utils.formatEther(removeEther)} RBNT`}
            </div>
            <button className={styles.button1} onClick={_removeLiquidity}>
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className=" flex-col justify-center h-[100vh] bg-gradient-to-r from-indigo-200 via-red-200 to-yellow-100">
      <div className=" flex justify-between items-center">
        <div className="ml-8 mt-8 ">
          <Image src={lp} height={80} width={80} className=" rounded-xl" ></Image>
        </div>
        {walletConnected ? <button onClick={connectWallet} className=" mr-8 p-2 h-16 rounded-xl border-2 font-bold text-lg border-yellow-200 bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-white px-4">Connected</button> : <button onClick={connectWallet} className=" mr-8 p-2 h-16 rounded-xl border-2 font-bold text-lg border-yellow-200 bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-white px-4">Connect Wallet</button>}
      </div>
      <div>
        <h1 className=" pt-[5%] text-5xl font-semibold font-mono text-center ">RWA Liquidity</h1>
        <p className="text-2xl font-semibold font-mono pt-[1%] text-center">Provide liquidity to RBNT-RUSD token pair in seconds.</p>
      </div>
      {!walletConnected && <div className=" flex justify-center h-96 border-4 mt-4 ml-4 mr-4 rounded-r-lg items-center">
        <p className=" text-center text-3xl font-semibold bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text">Connect Your Wallet.</p>
      </div>}
      {walletConnected &&
        <div className=" flex justify-center pt-[2%] gap-10">
          <div className=" flex bg-red-300 h-96 w-[50%] ml-20 rounded-3xl">
            {renderButton()}
          </div>
          <div className=" flex-col bg-red-300 w-[50%] mr-20 rounded-3xl">
            <p className=" ml-4 text-white font-semibold text-3xl mt-4">You have: </p>
            <p className=" ml-4 font-bold text-3xl mt-3">{utils.formatEther(cdBalance)} RUSD</p>
            <p className=" ml-4 font-bold text-3xl mt-3">{utils.formatEther(ethBalance)} <span className=" text-red-600">RBNT</span></p>
            <p className=" ml-4 font-bold text-3xl mt-3">{utils.formatEther(lpBalance)} <span className="bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text">RWADex LP Tokens</span></p>
          </div>
        </div>}
    </div>
  );
}


{/* <div>
      <div className="min-h-screen flex flex-row justify-center items-center font-courier">
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs Exchange!</h1>
          <div className={styles.description}>
            Exchange Ethereum &#60;&#62; Crypto Dev Tokens
          </div>
          <div>
            <button
              className={styles.button}
              onClick={() => {
                setLiquidityTab(liquidityTab);
              }}
            >
              Provide Liquidity
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div> */}