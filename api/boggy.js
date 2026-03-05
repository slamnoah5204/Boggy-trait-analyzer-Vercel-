import { ethers } from "ethers";

const APECHAIN_RPC = "https://rpc.ankr.com/ape_chain";
const BOGGY_CONTRACT = "0x5d0563ff947f4ed596a4dAa6F2BE00f4f326b0bc";
const ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function tokenURI(uint256 tokenId) view returns (string)"
];

const provider = new ethers.JsonRpcProvider(APECHAIN_RPC);
const contract = new ethers.Contract(BOGGY_CONTRACT, ABI, provider);

const gateways = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/"
];

function ipfsToHttp(uri) {
  if (!uri.startsWith("ipfs://")) return uri;
  return uri.replace("ipfs://", "");
}

async function fetchWithFallback(cid) {
  for (const gw of gateways) {
    try {
      const res = await fetch(gw + cid);
      if (res.ok) return res.json();
    } catch {}
  }
  throw new Error("IPFS fetch failed (all gateways failed)");
}

async function getOwnedTokenIds(wallet) {
  const received = await contract.queryFilter(contract.filters.Transfer(null, wallet));
  const sent = await contract.queryFilter(contract.filters.Transfer(wallet, null));
  const receivedIds = received.map(e => e.args.tokenId.toString());
  const sentSet = new Set(sent.map(e => e.args.tokenId.toString()));
  return receivedIds.filter(id => !sentSet.has(id));
}

export default async function handler(req, res) {
  const { wallet } = req.query;
  if (!wallet) return res.status(400).json({ error: "Missing wallet parameter" });

  try {
    const tokenIds = await getOwnedTokenIds(wallet);
    const traitCount = {};
    for (const tokenId of tokenIds) {
      try {
        const metadata = await fetchWithFallback(ipfsToHttp(await contract.tokenURI(tokenId)));
        if (!metadata.attributes) continue;
        for (const attr of metadata.attributes) {
          const key = `${attr.trait_type}: ${attr.value}`;
          traitCount[key] = (traitCount[key] || 0) + 1;
        }
      } catch {}
    }
    res.status(200).json({ wallet, totalBoggy: tokenIds.length, traits: traitCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}