import {
  defaultRegistryTypes,
  assertIsDeliverTxSuccess,
  SigningStargateClient,
  QueryClient,
  GasPrice,
  calculateFee,
  createProtobufRpcClient
} from "@cosmjs/stargate";
import bech32 from "bech32";
import { Registry, coins } from "@cosmjs/proto-signing";
import {
  SigningCosmWasmClient,
  CosmWasmClient
} from "@cosmjs/cosmwasm-stargate";
import { Tendermint37Client } from "@cosmjs/tendermint-rpc";
import * as bank from "cosmjs-types/cosmos/bank/v1beta1/query";

// Fix BigInt globaly
BigInt.prototype.toJSON = function() { return this.toString() }

async function initRpc(chainRpc) {
  /* if (this.rpcClient) {
    this.rpcBase.disconnect();
  } */
  const client = await Tendermint37Client.connect(chainRpc);
  const queryClient = new QueryClient(client);
  const rpcClient = createProtobufRpcClient(queryClient);
  return rpcClient;
}
 
async function selectSigner(chainId, signerType, suggestChain = "") { 
  const response = await fetch(suggestChain);
  const returnExperimentalSuggestChain = await response.json();
  await window.keplr.experimentalSuggestChain(
    returnExperimentalSuggestChain,
  ); 
  
  if (signerType === "Keplr") {
    if (!window.getOfflineSigner || !window.keplr) {
      alert("Please install keplr extension");
    } else {
      await window.keplr.enable(chainId);
      const offlineSigner = await window.getOfflineSignerAuto(chainId);
      return offlineSigner;
    }
  } else if (signerType === "Cosmostation") {
    await window.cosmostation.providers.keplr.enable(chainId); 
    const offlineSigner = window.cosmostation.providers.keplr.getOfflineSigner(chainId);
    return offlineSigner;
  } else if (signerType === 'Leap') {
    await window.leap.enable(chainId); 
    const offlineSigner = window.leap.getOfflineSigner(chainId);
    return offlineSigner;
  } 
}
async function signerConnect(chainId, signerType) {
  try {
    let offlineSigner = await selectSigner(chainId, signerType)   
    const accounts = await offlineSigner.getAccounts(); 
    console.log('console js ', accounts);  
    return accounts; 
  } catch(error) {
    return error; 
  }
  
}
async function signArbitrary(chainId, message, signerType) {  
  let offlineSigner = await selectSigner(chainId, signerType)   
  const accounts = await offlineSigner.getAccounts();

  let finalSinger = ""
  if (signerType === "Keplr") {
    finalSinger = window.keplr
  } else if (signerType === "Cosmostation") {
    finalSinger = window.cosmostation.providers.keplr
  } else if (signerType === 'Leap') {
    finalSinger = window.leap
  }     

  const address = accounts[0].address
  const signature = await finalSinger.signArbitrary(
      chainId,
      address,
      message,
  )
  console.log(signature)
  const signArbitrary = await finalSinger.verifyArbitrary(
      chainId,
      address,
      message,
      signature
  ) 
  return { signArbitrary, address };        
}

async function sendToken(chainId, chainRpc, chainGas, chaindenom, to, amount, signerType, suggestChain) { 
  console.log("chainRpc", chainRpc)
  console.log("chainGas", chainGas)

  let offlineSigner = await selectSigner(chainId, signerType, suggestChain)  
  const accounts = await offlineSigner.getAccounts();

  const client = await SigningStargateClient.connectWithSigner(
    chainRpc,
    offlineSigner,
    {
      gasPrice: GasPrice.fromString(chainGas + chaindenom),
    }
  );

  const foundMsgType = defaultRegistryTypes.find(
    (element) =>
      element[0] ===
      "/cosmos.bank.v1beta1.MsgSend"
  );
  
  const finalAmount = coins(amount, chaindenom);
  const finalMsg = {
  typeUrl: foundMsgType[0],
    value: foundMsgType[1].fromPartial({
      fromAddress: accounts[0].address,
      toAddress: to,
      amount: finalAmount,
    }),
  }     
  console.log('sendTx', finalMsg)

  try {
    const result = await client.signAndBroadcast(
      accounts[0].address,
      [finalMsg],
      "auto",
      ""
    );
    assertIsDeliverTxSuccess(result);
    console.log("returnSendToken", result)
    return result;
  } catch(error) {
    console.log(error)
    return error;
  } 
}
/*
async function wasmExecute(chainId, chainRpc, chainGas, chaindenom, contractAddr, message, signerType) { 

  let offlineSigner = await selectSigner(chainId, signerType)  
  const accounts = await offlineSigner.getAccounts();

  const client = await SigningCosmWasmClient.connectWithSigner(
    chainRpc,
    offlineSigner,
    {
      gasPrice: GasPrice.fromString(chainGas + chaindenom),
    },
  );
  console.log('simplemessage', message)
  console.log(JSON.parse(message))
  console.log('stringifymessage', JSON.stringify(message))
  
  try {
    const result = await client.execute(
      accounts[0].address,
      contractAddr,
      JSON.parse(message),
      "auto",
      "",
      "", // Send token
    );
    assertIsDeliverTxSuccess(result);
  } catch(error) {
    console.log(error)
  }
  console.log("accounts", accounts)
} */
async function wasmExecute(chainId, chainRpc, chainGas, chaindenom, contractAddr, execName, execData, signerType) { 

  let offlineSigner = await selectSigner(chainId, signerType)  
  const accounts = await offlineSigner.getAccounts();

  const client = await SigningCosmWasmClient.connectWithSigner(
    chainRpc,
    offlineSigner,
    {
      gasPrice: GasPrice.fromString(chainGas + chaindenom),
    },
  );

  console.log('execName', JSON.parse(execName))
  console.log('execData', JSON.parse(execData))
  
  let finalExecName = JSON.parse(execName)
  let finalExecData = JSON.parse(execData)

  let finalDataArray = {}
  for (const [key, value] of Object.entries(finalExecData.Items)) {
    finalDataArray[value.key] = value.Value
  }
  
  try {
    const result = await client.execute(
      accounts[0].address,
      contractAddr,
      JSON.parse(
        JSON.stringify(
          { 
            [finalExecName.exectuteName]: finalDataArray
          }
        )
      ),
      "auto",
      "",
      "", // Send token
    );
    assertIsDeliverTxSuccess(result);
    return result;
  } catch(error) {
    console.log(error)
    return error;
  } 
}


async function wasmQuery(chainRpc, contractAddr, queryName, queryData) {  

  console.log('chainId to query', chainRpc)
  console.log('contractAddr to query', contractAddr)

  let finalQueryName = JSON.parse(queryName)
  let finalQueryData = JSON.parse(queryData)


  let finalDataArray = {}
  for (const [key, value] of Object.entries(finalQueryData.Items)) {
    finalDataArray[value.key] = value.Value
  }

  const client = await CosmWasmClient.connect(chainRpc);
  const result = await client.queryContractSmart(
    contractAddr, 
    JSON.parse(
      JSON.stringify(
        { 
          [finalQueryName.queryName]: finalDataArray
        }
      )
    )
  ); 
  console.log('result wasm result', result)
  return result;

}
async function queryAccount(chainRpc, chainDenom, chainExponent, addressPrefix, address) { 
  console.log('chainId to query', chainRpc)
  console.log('address to query', address)
  console.log('chainDenom to query', chainDenom)
  console.log('chainExponent to query', chainExponent)
  console.log('addressPrefix to query', addressPrefix)

  let client = await initRpc(chainRpc);
  console.log('client', client)

  const decode = bech32.decode(address)
  const returnAddress = bech32.encode(addressPrefix, decode.words)


  const queryBank = new bank.QueryClientImpl(client);
  let spendableBalances = await queryBank.SpendableBalances({
    address: returnAddress,
  });
  const found = spendableBalances.balances.find(
    (element) =>
      element.denom ===
      chainDenom,
  );
  // TODO: fix this
  let returnValue = "";
  if (found?.amount > 0) {
    returnValue =
      found?.amount /
      Number("1e" + chainExponent);
  } else {
    returnValue = 0;
  }
  console.log('returnValue', returnValue)
  return returnValue;
}

export default { 
  selectSigner, 
  signArbitrary, 
  signerConnect, 
  sendToken,
  // Wasm part
  wasmExecute,
  wasmQuery,
  // Query part
  queryAccount
};
