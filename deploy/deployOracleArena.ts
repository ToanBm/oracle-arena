import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerClient,
} from "genlayer-js/types";

export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), "contracts/oracle_arena.py");

  try {
    const contractCode = new Uint8Array(readFileSync(filePath));

    const deployTransaction = await client.deployContract({
      code: contractCode,
      args: [],
    });

    const receipt = await client.waitForTransactionReceipt({
      hash: deployTransaction as TransactionHash,
      status: TransactionStatus.ACCEPTED,
      retries: 50,
      interval: 5000,
    });

    if (
      receipt.consensus_data?.leader_receipt?.[0]?.execution_result !==
      "SUCCESS"
    ) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt)}`);
    }

    const deployedContractAddress = receipt.data?.contract_address;
    console.log(`OracleArena deployed at address: ${deployedContractAddress}`);
    console.log(`\nAdd to frontend/.env:`);
    console.log(`NEXT_PUBLIC_ORACLE_CONTRACT_ADDRESS=${deployedContractAddress}`);
  } catch (error) {
    throw new Error(`Error during deployment: ${error}`);
  }
}
