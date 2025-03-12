import { useState } from "react";
import { ethers } from "ethers"; // Sửa import thành "ethers" đơn giản
import "./App.css";

function App() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const networkConfig = {
    rpcUrl: "https://porcini.rootnet.app/archive",
    chainId: "0x1df8", // Chain ID 7672
  };

  // Kết nối MetaMask
  const connectToMetaMask = async () => {
    if (!window.ethereum) {
      setMessage("MetaMask không được cài đặt!");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const accounts = await provider.listAccounts();
      setAccount(accounts[0]);
      setIsConnected(true);

      try {
        await provider.send("wallet_switchEthereumChain", [{ chainId: networkConfig.chainId }]);
      } catch (switchError) {
        if (switchError.code === 4902) {
          await provider.send("wallet_addEthereumChain", [{
            chainId: networkConfig.chainId,
            chainName: "The Root Network Testnet (Porcini)",
            rpcUrls: [networkConfig.rpcUrl],
            nativeCurrency: { name: "XRP", symbol: "XRP", decimals: 6 },
            blockExplorerUrls: ["https://explorer.porcini.rootnet.app"],
          }]);
        } else {
          throw switchError;
        }
      }
      setMessage("Đã kết nối MetaMask thành công!");
    } catch (error) {
      setMessage(`Lỗi kết nối: ${error.message}`);
    }
  };

  // Gửi XRP
  const transferXRP = async () => {
    setMessage("");
    if (!recipient || !amount) {
      setMessage("Vui lòng nhập đầy đủ địa chỉ và số lượng!");
      return;
    }
    if (!isConnected) {
      setMessage("Vui lòng kết nối MetaMask trước!");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const tx = {
        to: recipient,
        value: ethers.utils.parseUnits(amount, 6),
        gasLimit: 21000,
      };

      setMessage("Đang gửi giao dịch, xác nhận trong MetaMask...");
      const transaction = await signer.sendTransaction(tx);
      setMessage(`Transaction Hash: ${transaction.hash}`);

      const receipt = await transaction.wait();
      setMessage(`Giao dịch thành công! Block: ${receipt.blockNumber}`);
    } catch (error) {
      setMessage(`Lỗi: ${error.message}`);
    }
  };

  return (
    <div className="App">
      <h1>Transfer XRP on Testnet</h1>
      <button onClick={connectToMetaMask}>
        {isConnected ? "Connected" : "Connect MetaMask"}
      </button>
      {isConnected && <p>Account: {account}</p>}
      
      <input
        type="text"
        placeholder="Recipient Address (0x...)"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount (XRP)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={transferXRP}>Send XRP</button>
      {message && <p>{message}</p>}
    </div>
  );
}

export default App;