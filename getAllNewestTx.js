const Web3 = require('web3');
const web3 = new Web3();
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const smartContractAddress = "0x016d651c2FCA418d7Ebe9E4D7757da42FFcC50a6";

const getBlockRangeInTimeRange = async (timeRange) => {
    let temp = '';
    let timestampNow = Math.floor(new Date().getTime()/1000.0);
    let timestampBefore = timestampNow - 60*timeRange;
    let currentBlockFetchURL = temp.concat("https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=",timestampNow.toString(),"&closest=before&apikey=",(process.env.ETHERSCAN_API_KEY).toString());
    let beforeBlockFetchURL = temp.concat("https://api.etherscan.io/api?module=block&action=getblocknobytime&timestamp=",timestampBefore.toString(),"&closest=before&apikey=",(process.env.ETHERSCAN_API_KEY).toString());
    const responseCurrentBlock = await fetch(currentBlockFetchURL.concat(process.env.ETHERSCAN_API_KEY));
    const dataCurrentBlock = await responseCurrentBlock.json();
    const currentBlockNumber = dataCurrentBlock.result;
    const responseBeforeBlock = await fetch(beforeBlockFetchURL.concat(process.env.ETHERSCAN_API_KEY));
    const dataBeforeBlock = await responseBeforeBlock.json();
    const beforeBlockNumber = dataBeforeBlock.result;
    // console.log({
    //     currentBlockNumber,
    //     beforeBlockNumber
    // })
    return {
        currentBlockNumber,
        beforeBlockNumber
    };
}

const getAllEventInTimeRange = async (timeRange) => {
    let temp = '';
    const {
        currentBlockNumber,
        beforeBlockNumber
    } = await getBlockRangeInTimeRange(timeRange);
    let url = temp.concat("https://api.etherscan.io/api?module=logs&action=getLogs&address=",smartContractAddress,"&fromBlock=",beforeBlockNumber.toString(),"&toBlock=",currentBlockNumber.toString(),"&page=1&offset=1000&apikey=",(process.env.ETHERSCAN_API_KEY).toString())
    const response = await fetch(url);
    const data = await response.json();
    return data.result;
}

const filterAllActionDataInTimeRange = async (timeRange) => {
    const typesStakeEvent = [
        {type: 'address', name: 'staker'}, 
        {type: 'address[]', name: 'erc721Adds'},
        {type: 'uint256[]', name: 'tokenIds'},
        {type: 'uint256', name: 'stakedTime'}
    ];
    const hashStakeEvent = web3.utils.sha3("StakeAssets(address,address[],uint256[],uint256)");
    const typesUnStakeEvent = [
        {type: 'address', name: 'staker'}, 
        {type: 'address[]', name: 'erc721Adds'},
        {type: 'uint256[]', name: 'tokenIds'},
        {type: 'uint256', name: 'unStakedTime'}
    ];
    const hashUntakeEvent = web3.utils.sha3("UnstakeAssets(address,address[],uint256[],uint256)");
    
    let events = await getAllEventInTimeRange(timeRange);
    let res = [];
    for(let i = 0; i< events.length; i++){
        if(events[i].topics[0] === hashStakeEvent){
            let decodedStakeOnChainData = web3.eth.abi.decodeParameters(typesStakeEvent, events[i].data);
            let stakedActionTxHash = events[i].transactionHash;
            let stakedActionTimestamp = events[i].timeStamp;
            let actionType = "Stake";
            res.push({
                actionType,
                stakedActionTimestamp,
                stakedActionTxHash,
                decodedStakeOnChainData
            })
        }
        if(events[i].topics[0] === hashUntakeEvent){
            let decodedUnstakeOnChainData = web3.eth.abi.decodeParameters(typesUnStakeEvent, events[i].data);
            let unstakedActionTxHash = events[i].transactionHash;
            let unstakedActionTimestamp = events[i].timeStamp;
            let actionType = "Unstake";
            res.push({
                actionType,
                unstakedActionTimestamp,
                unstakedActionTxHash,
                decodedUnstakeOnChainData
            })
        }
    }
    console.log(res);
    return res;
}

filterAllActionDataInTimeRange(100000);