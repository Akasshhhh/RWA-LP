import { BigNumber, ethers, providers, utils } from "ethers";
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

  const [loading, setLoading] = useState(false);

  const [liquidityTab, setLiquidityTab] = useState(true);
  const zero = BigNumber.from(0);
  const [ethBalance, setEtherBalance] = useState(zero);
  const [reservedCD, setReservedCD] = useState(zero);
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
  const [cdBalance, setCDBalance] = useState(zero);
  const [lpBalance, setLPBalance] = useState(zero);
  const [addEther, setAddEther] = useState(zero);
  const [addCDTokens, setAddCDTokens] = useState(zero);
  const [removeEther, setRemoveEther] = useState(zero);
  const [removeCD, setRemoveCD] = useState(zero);
  const [removeLPTokens, setRemoveLPTokens] = useState("0");
  const [liquidityAdded, setLiquidityAdded] = useState(false);
  const [removedLiquidity, setRemovedLiquidity] = useState(false);
  const [activeMessage, setActiveMessage] = useState(0);


  const [ethSelected, setEthSelected] = useState(true);
  /** Wallet connection */
  const web3ModalRef = useRef();
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

  const _addLiquidity = async () => {
    try {
      // Convert the ether amount entered by the user to Bignumber
      const addEtherWei = utils.parseEther(addEther.toString());
      // Check if the values are zero
      if (!addCDTokens.eq(zero) && !addEtherWei.eq(zero)) {
        const signer = await getProviderOrSigner(true);
        setLoading(true);
        // call the addLiquidity function from the utils folder
        const tx = await addLiquidity(signer, addCDTokens, addEtherWei);
      
      // Wait for the transaction receipt to confirm its status
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        // Transaction successful
        setLoading(false);
        // Reinitialize the CD tokens
        setAddCDTokens(zero);
        // Get amounts for all values after the liquidity has been added
        await getAmounts();
        setLiquidityAdded(true);
        setActiveMessage(1);
      } else {
        // Transaction failed
        setLoading(false);
        setLiquidityAdded(false);
        setActiveMessage(0);
      }
      } else {
        setAddCDTokens(zero);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setAddCDTokens(zero);
      setLiquidityAdded(false);
      setActiveMessage(0);
    }
  };

  const _removeLiquidity = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      // Convert the LP tokens entered by the user to a BigNumber
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);
      // Call the removeLiquidity function from the `utils` folder
      const tx = await removeLiquidity(signer, removeLPTokensWei);
      
      // Wait for the transaction receipt to confirm its status
      const receipt = await tx.wait();
  
      if (receipt.status === 1) {
        // Transaction successful
        setLoading(false);
        await getAmounts();
        setRemoveCD(zero);
        setRemoveEther(zero);
        setRemovedLiquidity(true);
        setActiveMessage(2);
      } else {
        // Transaction failed
        setLoading(false);
        setRemovedLiquidity(false);
        setActiveMessage(0);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
      setRemoveCD(zero);
      setRemoveEther(zero);
      // Handle the error state here
      setRemovedLiquidity(false);
      setActiveMessage(0);
    }
  };
  

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

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  const getProviderOrSigner = async (needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

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

  useEffect(() => {
    const initialize = async () => {
      if (!walletConnected) {
        web3ModalRef.current = new Web3Modal({
          network: "RedbellyDevNet",
          providerOptions: {},
          disableInjectedProvider: false,
        });
        await connectWallet();
      }
      getAmounts();
    };
  
    // Run the initialization when the component mounts
    initialize();
  
    // Run the initialization again when walletConnected changes
    // but only if it's true
    if (walletConnected) {
      initialize();
    }
  }, [walletConnected]);
  console.log(utils.formatEther(cdBalance));




      const addLiqButton = () => {

    
        return (
          
              
                <div className="flex-col align-middle justify-center ">
                  <p className=" text-xl font-bold inline-block ml-6">Add Liquidity</p>
                  <div className="w-[100%] flex ml-4 h-[100%] ">
                  <input min={0.001}
                    type="number"
                    placeholder="Amount of RBNT"
                    onChange={async (e) => {
                      setAddEther(e.target.value || "0");
                      // calculate the number of CD tokens that
                      // can be added given  e.target.value amount of Eth
                      const _addCDTokens = await calculateCD(
                        e.target.value || "0",
                        etherBalanceContract,
                        reservedCD
                      );
                      setAddCDTokens(_addCDTokens);
                    }}
                    className=" mt-4 font-semibold pl-2 pr-12 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 outline-none appearance-none"
                  />
                  <div className={styles.inputDiv}>
                    {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                    {`You will need ${utils.formatEther(addCDTokens)} RUSD Tokens to add liquidity`}
                  </div>
                  </div>
    
                  <button className=" rounded-xl mb-5  border-1 px-14 text-white py-4 bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 hover:from-yellow-500 hover:to-purple-500 hover:via-red-500 ml-4 mt-3" onClick={_addLiquidity}>
                    Add Liquidity
                  </button>
                  
                </div>
              
          
        );
      };

      const removeLiqButton =() =>{
       return (<div className="flex-col justify-center">
              <p className=" text-xl font-bold inline-block ml-6 mt-4 ">Remove Liquidity</p>
                <div className=" ml-4 flex w-[100%] ">
                <input min={0.0000001} 
                  type="number"
                  placeholder="Amount of LP Tokens"
                  onChange={async (e) => {
                    setRemoveLPTokens(e.target.value || "0");
                    // Calculate the amount of Ether and CD tokens that the user would receive
                    // After he removes e.target.value amount of LP tokens
                    await _getTokensAfterRemove(e.target.value || "0");
                  }}
                  className=" mt-4 font-semibold pl-2 pr-12 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 outline-none appearance-none"
                />
                <div className={styles.inputDiv}>
                  {/* Convert the BigNumber to string using the formatEther function from ethers.js */}
                  {`You will get ${utils.formatEther(removeCD)} RUSD and ${utils.formatEther(removeEther)} RBNT`}
                </div>
                </div>
                <button className="px-10 rounded-xl border-black border-1 text-white py-4 bg-red-600 ml-4 mt-3 mb-5" onClick={_removeLiquidity}>
                  Remove Liquidity
                </button>
              </div>)
      }
  return (
    <div className=" flex-col justify-center min-h-[100vh] bg-gradient-to-r from-indigo-200 via-red-200 to-yellow-100">
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
        <div className=" flex justify-center pt-[2%] gap-8 ">
          <div className=" flex bg-red-300 h-[30rem] w-[50%] pt-10 ml-20 pl-10 rounded-3xl">
          <div className="main flex-col ml-16 mt-5 w-max ">
            {addLiqButton()}
            {lpBalance > 0?removeLiqButton():<></>}
          </div>
          </div>
          <div className=" flex-col bg-red-300 w-[50%] mr-20 rounded-3xl pt-10 pl-10">
            <p className=" ml-4 text-white font-semibold text-3xl mt-8 pb-8 pt-2">You have: </p>
            
            <p className=" ml-4 font-bold text-3xl ">{utils.formatEther(cdBalance)} RUSD</p>
            <p className=" mt-1/2 ml-4 text-sm w-auto font-medium">Not enough RUSD? Swap your RBNT to RUSD <a className=" italic font-bold text-blue-900" target="_blank" href="https://rwa-dex.vercel.app/">here</a>.</p>
            
            <p className=" ml-4 font-bold text-3xl mt-3">{utils.formatEther(ethBalance)} <span className=" text-red-700">RBNT</span></p>
            <p className=" ml-4 font-bold text-3xl mt-3">{utils.formatEther(lpBalance)} <span className="bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text">RWADex LP Tokens</span></p>
          </div>
        </div>}
        {liquidityAdded && activeMessage === 1?<p className=" pt-6 text-3xl text-center font-bold bg-gradient-to-r from-purple-500 via-red-500 to-yellow-500 text-transparent bg-clip-text">Liquidity Added Successfully!</p>:<></>}
        {removedLiquidity && activeMessage === 2?<p className=" pt-6 text-3xl text-center font-bold ">Liquidity removed successfully!</p>:<></>}
    </div>
  );
}

