import fetch from "node-fetch";

const API_KEY = "cqt_rQMvY8HxGWfcfqQTpFvDVwxHJCR6"; // 你的 GoldRush API Key
const BOGGY_CONTRACT = "0x5d0563ff947f4ed596a4dAa6F2BE00f4f326b0bc";

export default async function handler(req, res) {
  const wallet = req.query.wallet;
  if(!wallet) return res.status(400).json({error:"缺少 wallet"});

  try{
    const url = `https://api.goldrush.dev/v1/chains/apechain-mainnet/nfts/${wallet}?apikey=${API_KEY}`;
    const r = await fetch(url);

    // 先抓文字，不直接 parse
    const text = await r.text();
    let data;

    try{
      data = JSON.parse(text);
    } catch(e){
      return res.status(500).json({error:"GoldRush API 沒回 JSON，內容: " + text});
    }

    // 過濾 BOGGY NFT
    const boggyNFTs = data.data ? data.data.filter(nft => nft.contract_address.toLowerCase() === BOGGY_CONTRACT.toLowerCase()) : [];
    res.status(200).json({nfts: boggyNFTs});
  }catch(e){
    res.status(500).json({error:e.message});
  }
}
