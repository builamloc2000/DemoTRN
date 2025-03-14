import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

function App() {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [account, setAccount] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  // Địa chỉ contract đã triển khai
  const contractAddress = "0xb9E605B6650Eee651698d03767736d8967c25365";
  
  // ABI của SimpleXRPTransfer contract
  const contractABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "XRPTransferred",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address payable",
          "name": "_recipient",
          "type": "address"
        }
      ],
      "name": "transferXRP",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    }
  ];

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

  // Gửi XRP thông qua smart contract
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

    // Tạo instance của contract
    const contract = new ethers.Contract(contractAddress, contractABI, signer);

    // Chuyển đổi số lượng XRP thành đơn vị ether
    const amountInEther = ethers.utils.parseEther(amount);

    // Ước lượng gas cần thiết
    const estimatedGas = await contract.estimateGas.transferXRP(recipient, {
      value: amountInEther,
    });
    console.log(`Ước lượng gas: ${estimatedGas.toString()}`);

    // Thêm buffer (ví dụ: +20%) để tránh out-of-gas
    const gasLimitWithBuffer = estimatedGas.mul(120).div(100); // Tăng 20%

    // Lấy Gas Price từ mạng (tùy chọn)
    const gasPrice = await provider.getGasPrice();
    console.log(`Gas Price hiện tại: ${ethers.utils.formatUnits(gasPrice, "gwei")} Gwei`);

    setMessage(`Đang gửi ${amount} XRP, xác nhận trong MetaMask...`);

    // Gửi giao dịch với gas động
    const transaction = await contract.transferXRP(recipient, {
      value: amountInEther,
      gasLimit: gasLimitWithBuffer,
      gasPrice: gasPrice, // Tùy chọn, có thể bỏ để MetaMask tự xử lý
    });
      
      setMessage(`Transaction Hash: ${transaction.hash}`);

      const receipt = await transaction.wait();
      setMessage(`Giao dịch thành công! Đã gửi ${amount} XRP. Block: ${receipt.blockNumber}`);
    } catch (error) {
      setMessage(`Lỗi: ${error.message}`);
    }
  };

  // Chuyển XRP trực tiếp (không qua contract)
  const transferXRPDirect = async () => {
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
      
      // Chuyển đổi số lượng XRP thành đơn vị ether thay vì đơn vị nhỏ nhất
      const amountInEther = ethers.utils.parseEther(amount);
      
      // Hiển thị giá trị đang gửi để debug
      console.log(`Gửi ${amount} XRP = ${amountInEther.toString()} (đơn vị ether)`);
      
      const tx = {
        to: recipient,
        value: amountInEther,
        gasLimit: 21000,
      };

      setMessage(`Đang gửi ${amount} XRP trực tiếp, xác nhận trong MetaMask...`);
      const transaction = await signer.sendTransaction(tx);
      setMessage(`Transaction Hash: ${transaction.hash}`);

      const receipt = await transaction.wait();
      setMessage(`Giao dịch thành công! Đã gửi ${amount} XRP. Block: ${receipt.blockNumber}`);
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
      <div className="amount-input-container">
        <input
          type="number"
          placeholder="Amount (XRP)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <span className="input-note">XRP (sử dụng đơn vị ether)</span>
      </div>
      <div className="button-container">
        <button onClick={transferXRP}>Send XRP via Contract</button>
        <button onClick={transferXRPDirect}>Send XRP Directly</button>
      </div>
      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default App;