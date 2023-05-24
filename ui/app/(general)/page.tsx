'use client'
import { motion } from 'framer-motion'
import '/styles/light.css'
import request from 'graphql-request'
import { useAccount, ConnectorData, useContractRead, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi'
import { BranchIsWalletConnected } from '@/components/shared/branch-is-wallet-connected'
import { Button } from '@/components/ui/button'
import { FADE_DOWN_ANIMATION_VARIANTS } from '@/config/design'
import { publicProvider } from 'wagmi/providers/public'
import {goerli, arbitrumGoerli, gnosisChiado} from 'wagmi/chains' 
import { readContract, configureChains, watchContractEvent, createClient } from '@wagmi/core'
import { BigNumber } from 'ethers'
const abi = require('../../assets/VeaOutboxArbToEthDevnet.json').abi
const { provider, webSocketProvider } = configureChains(
  [arbitrumGoerli, gnosisChiado],
  [publicProvider()],
)

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
 

import {FiExternalLink} from 'react-icons/fi'
 
const client = createClient({
  provider,
  webSocketProvider,
})
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [light, setLight] = useState(false)
  const [hitSwitch, setHitSwitch] = useState("loading...")
  const [claimVerified, setClaimVerified] = useState("loading...")
  const [time, setTime] = useState(0)
  const [veaBridgeConfirmation, setveaBridgeConfirmation] = useState(false)
  const [switchEpoch, setSwitchEpoch] = useState(0)
  var condition = light ? 'on' : 'off'
  var relayed = light ? '' : 'none'
  var switchHit = hitSwitch != "loading..."
  var tableDisplay = light || switchHit ? '' : 'none'
  var timerDisplay = switchHit && !light && !veaBridgeConfirmation ? '' : 'none'
  var bridgeSuccess = veaBridgeConfirmation || light ? '' : 'none'
  const count = useRef(0)
  var claimVerifiedBool = claimVerified != "loading..."

  const account = useAccount({
    onDisconnect() {
      setLight(false);
      setHitSwitch("loading...");
      setveaBridgeConfirmation(false);
      setTime(0)
    },

    async onConnect({ address, connector, isReconnected }) {
      const lightBulbIsOn = await readContract({
        address: '0xb525F403026DfE08ae0200834cBCAa27a56FD6A3',
        abi: [
          {
            inputs: [
              {
                internalType: 'address',
                name: '',
                type: 'address',
              },
            ],
            name: 'lightBulbIsOn',
            outputs: [
              {
                internalType: 'bool',
                name: '',
                type: 'bool',
              },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'lightBulbIsOn',
        chainId: 10200,
        args: [address!],
      })

      const latestVerifiedEpoch = (await readContract({
        address: '0xdFd7aDEb43d46FA3f16FB3e27F7fe85c3f5BD89D',
        abi: [
          {
            inputs:[],
            name:"latestVerifiedEpoch",
            outputs:[{internalType:"uint256",name:"",type:"uint256"}],
            stateMutability:"view",
            type:"function"}
        ],
        functionName: 'latestVerifiedEpoch',
        chainId: 10200,
      }) as BigNumber).toNumber()

      console.log('lightBulbIsOn', lightBulbIsOn)
      if (lightBulbIsOn)
        setLight(true);
      else
        setLight(false);
      const lightBulbToggles: any = await request(
        'https://api.thegraph.com/subgraphs/name/shotaronowhere/vea-lightbulb',
        `{
          lightBulbToggleds(first: 1, where: {lightBulbOwner: "${address}", chainId: 10200}, orderBy: blockTimestamp, orderDirection: asc) {
            messageId
            lightBulbOwner
            transactionHash
            blockTimestamp
          }
        }`
      )


      console.log(lightBulbToggles)
      if (lightBulbToggles.lightBulbToggleds.length > 0) {
        //goerli.infura.io/v3
        const msgid = lightBulbToggles.lightBulbToggleds[0].messageId
        const switchTime = lightBulbToggles.lightBulbToggleds[0].blockTimestamp
        const epoch = Math.floor(switchTime / 1800)
        setSwitchEpoch(epoch)
        console.log('switch epoch is', epoch);
        if (latestVerifiedEpoch >= epoch){
          console.log('latest epoch', latestVerifiedEpoch);
          console.log('msg epoch', epoch);
          setveaBridgeConfirmation(true)
          console.log('latestVerifiedEpoch', latestVerifiedEpoch)
          /*
          const bridgeTxn = await request(
            'https://thegraph.com/hosted-service/subgraph/alcercu/veascan-outbox-goerli',
            `{
              claims(first: 1, orderBy: epoch, where: {epoch_gte: 3}) {
                txHash
              }
            }`
          )*/
        }
        const bridgeTxn2: any = await request(
          'https://api.thegraph.com/subgraphs/name/shotaronowhere/veascan-inbox-arbitrumgoerli-g',
          `          {
            snapshots(first: 1, where: {epoch_gte: ${epoch}}, orderBy: epoch, orderDirection: asc) {
              txHash
            }
          }`
        )
        if (bridgeTxn2.snapshots.length > 0) {
          console.log(bridgeTxn2.snapshots[0].txHash)
          setClaimVerified(bridgeTxn2.snapshots[0].txHash);
        } else {
          console.log('no bridge txn')
        }

        const estimatedBridgeTimeComplete = Math.ceil((switchTime / 1800))*1800 + 60
        const estimatedBridgeTime = Math.max(estimatedBridgeTimeComplete - Math.floor(Date.now()/1000), 0)
        setTime(estimatedBridgeTime)
        setHitSwitch(lightBulbToggles.lightBulbToggleds[0].transactionHash)
        console.log('time set', estimatedBridgeTime)
      } else {
        setHitSwitch("loading...")
        setSwitchEpoch(0)
        setClaimVerified("loading...")
        setveaBridgeConfirmation(false);
        setTime(0)
      }
    },
  })

  const unwatch = watchContractEvent(
    {
      address: '0xdFd7aDEb43d46FA3f16FB3e27F7fe85c3f5BD89D',
      abi: abi,
      eventName: 'Verified',
      chainId: 10200,
      once: true,
    },
    (epoch) => {
      console.log('im watching')
      if (switchEpoch != 0){
        if ((epoch as number) >= switchEpoch){
          setveaBridgeConfirmation(true)
          console.log('latestVerifiedEpoch', epoch)
          }
      }
    },
  )

  function handleClick() {
    const switchTime = Math.floor(Date.now()/1000)
    const estimatedBridgeTimeComplete = Math.ceil((switchTime / 1800))*1800 + 60
    const estimatedBridgeTime = Math.max(estimatedBridgeTimeComplete - Math.floor(Date.now()/1000), 0)
    setTime(estimatedBridgeTime)
  }
/*
  if(time == 0){
    console.log('yoyoyoyoyoyo')
    const { data, isError, isLoading } = useContractRead({
      address: '0xdFd7aDEb43d46FA3f16FB3e27F7fe85c3f5BD89D',
      abi: [
        {
          inputs:[],
          name:"latestVerifiedEpoch",
          outputs:[{internalType:"uint256",name:"",type:"uint256"}],
          stateMutability:"view",
          type:"function"}
      ],
      functionName: 'latestVerifiedEpoch',
      chainId: 10200,
      onSuccess(data) {
        console.log('Success', data)
      },
      onError(error) {
        console.log('Error', error)
      },
    })
      //console.log('data is', data)
  }*/

  useEffect(() => {
    // create a interval and get the id
    const myInterval = setInterval(() => {
      setTime((time) => {
        if (time > 0) return time - 1
        return time
      })
    }, 1000)
  
    console.log('time',time)
  
	const handleConnectorUpdate = async ({account, chain}: ConnectorData) => {
    setHitSwitch("loading...")
    setTime(0)
    setSwitchEpoch(0)
    setveaBridgeConfirmation(false);
    setClaimVerified("loading...")

    if (account) {
      const lightBulbIsOn = await readContract({
        address: '0xb525F403026DfE08ae0200834cBCAa27a56FD6A3',
        abi: [
          {
            inputs: [
              {
                internalType: 'address',
                name: '',
                type: 'address',
              },
            ],
            name: 'lightBulbIsOn',
            outputs: [
              {
                internalType: 'bool',
                name: '',
                type: 'bool',
              },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'lightBulbIsOn',
        chainId: 10200,
        args: [account!],
      })
      console.log('lightBulbIsOn', lightBulbIsOn)
      if (lightBulbIsOn)
        setLight(true);
      else
        setLight(false);
      const lightBulbToggles: any = await request(
        'https://api.thegraph.com/subgraphs/name/shotaronowhere/vea-lightbulb',
        `{
          lightBulbToggleds(first: 1, where: {lightBulbOwner: "${account}", chainId: 10200}, orderBy: blockTimestamp, orderDirection: asc) {
            messageId
            lightBulbOwner
            blockTimestamp
            transactionHash
          }
        }`
      )
      console.log(lightBulbToggles)
      if (lightBulbToggles.lightBulbToggleds.length > 0) {
        //goerli.infura.io/v3
        //https: console.log(lightBulbToggles.lightBulbToggleds[0].messageId)
        const switchTime = lightBulbToggles.lightBulbToggleds[0].blockTimestamp
        const estimatedBridgeTimeComplete = Math.ceil((switchTime / 1800))*1800 + 60
        const estimatedBridgeTime = Math.max(estimatedBridgeTimeComplete - Math.floor(Date.now()/1000), 0)
        setTime(estimatedBridgeTime)
        setHitSwitch(lightBulbToggles.lightBulbToggleds[0].transactionHash)
        console.log('time set', estimatedBridgeTime)
        const bridgeTxn2: any = await request(
          'https://api.thegraph.com/subgraphs/name/shotaronowhere/veascan-inbox-arbitrumgoerli-g',
          `          {
            snapshots(first: 1, where: {epoch_gte: ${Math.floor(switchTime/1800)}}, orderBy: epoch, orderDirection: asc) {
              txHash
            }
          }`
        )
        if (bridgeTxn2.snapshots.length > 0) {
          console.log(bridgeTxn2.snapshots[0].txHash)
          setClaimVerified(bridgeTxn2.snapshots[0].txHash);
        } else {
          console.log('no bridge txn')
        }
        
      } 
    } else if (chain) {
      console.log('new chain', chain)
    }
  }

  if (account.connector) {
    account.connector.on('change', handleConnectorUpdate)
    }

      // clear out the interval using the id when unmounting the component
      return () => clearInterval(myInterval)
  }
  , [light, account.connector, time])

  const { config, error } = usePrepareContractWrite({
    address: '0xcDCB9CebbD0182408bfcD910D9df216F760D376C',
    abi: [
      {
        inputs: [],
        name: 'turnOnLightBulb',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ],
    functionName: 'turnOnLightBulb'
  })
  const { data, write } = useContractWrite(config)

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
    onSuccess(data) {
      setHitSwitch(data.transactionHash)
      handleClick()
    },
  })

  return (
    <>
          <motion.div
        className={`flex-center ${condition} body flex h-full w-full`}
        variants={FADE_DOWN_ANIMATION_VARIANTS}
        initial="hidden"
        whileInView="show"
        animate="show"
        viewport={{ once: true }}>
        <div className={`flex-center ${condition} body flex h-full w-full`}>
          <div className="light" style={{ margin: '10px 0' }}>
            <div className="gnosis"></div>
            <div className="wire"></div>
            <div className="bulb">
              <span></span>
              <span></span>
            </div>
          </div>
          <div className="switches">
            <span className="switch">
              <Button className="btn" disabled={!write || switchHit} onClick={() => write?.()}></Button>
            </span>
          </div>
        </div>
        </motion.div>
  <table className="table" style={{width: "80%", display: `${tableDisplay}`, zIndex:"0"}}>
    {/* head */}
    <thead>
    <tr>
      <th>Step</th>
      <th>Chain</th>
      <th>Txn</th>
      <th>Status</th>
      </tr>
    </thead>
    <tbody>
      {/* row 1 */}
      <tr className="hover">
        <th>Switch 🎚</th>
        <td><img src='/icons/NetworkArbitrumTest.svg'></img></td>
        <td><span style={{display: "flex"}}>{switchHit? hitSwitch.substring(0,5)+'...'+hitSwitch.substring(hitSwitch.length-4,hitSwitch.length-1) : hitSwitch}&nbsp;<a target="_blank" href={"https://goerli.arbiscan.io/tx/"+hitSwitch}><FiExternalLink/></a></span></td>
        <td>✅</td>
      </tr>
      {/* row 2 */}
      <tr className="hover">
      <th>Vea 1 / 2 &nbsp; 🌉</th>
        <td><img src='/icons/NetworkArbitrumTest.svg'></img></td>
        <td><div style={{display: bridgeSuccess}}><span style={{display: "flex"}}>{claimVerifiedBool? claimVerified.substring(0,5)+'...'+claimVerified.substring(claimVerified.length-4,claimVerified.length-1) : claimVerified}&nbsp;<a target="_blank" href={"https://goerli.arbiscan.io/tx/"+claimVerified}><FiExternalLink/></a></span></div></td>
        <td><div style={{display: timerDisplay}}>
                <div className="countdown font-mono">
                  ~<span id="minute" style={{ '--value': Math.floor((time - Math.floor(time / 3600) * 3600) / 60) } as React.CSSProperties}></span>:
                  <span
                    id="second"
                    style={{
                      '--value': time - Math.floor(time / 3600) * 3600 - Math.floor((time - Math.floor(time / 3600) * 3600) / 60) * 60,
                    }as React.CSSProperties}></span>
            </div>
            </div>
            <div style={{display: bridgeSuccess}}>✅</div>
          </td>
      </tr>
      <tr className="hover">
        <th>Vea 2 / 2  &nbsp;  🌉</th>
        <td><img src='/icons/NetworkGnosis.svg'></img></td>
        <td><div style={{display: bridgeSuccess}}><span style={{display: "flex"}}>veascan<a target="_blank" href="https://veascan.io/"><FiExternalLink/></a></span></div></td>
        <td>
            <div style={{display: bridgeSuccess}}>✅</div>
          </td>
      </tr>
      {/* row 3 */}
      <tr className="hover">
      <th>Lightbulb 💡</th>
        <td><img src='/icons/NetworkGnosis.svg'></img></td>
        <td><div style={{display: relayed}}><span style={{display: "flex"}}>veascan<a target="_blank" href="https://veascan.io/"><FiExternalLink/></a></span></div></td>
        <td><div style={{display: relayed}}>✅</div>
</td>
      </tr>
    </tbody>
  </table>
    </>
  )
}