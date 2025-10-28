# WebView Communication
Source: https://lemoncash.mintlify.app/concepts/webview-communication

Understand how your mini app communicates with the Lemon Cash mobile app

## Overview

The Mini App SDK enables communication between your web-based mini app and the Lemon Cash mobile application through React Native WebView technology. This communication bridge allows your mini app to request wallet authentication, deposit and withdrawal transactions, as well as smart contract interactions.

## How it works

The communication flow follows a message-based architecture:

<Steps>
  <Step title="Mini app sends message">
    Your mini app sends a message to the native app using `window.ReactNativeWebView.postMessage()`.

    ```typescript  theme={null}
    // Example: Sending authentication request
    window.ReactNativeWebView.postMessage(JSON.stringify({
      action: 'AUTHENTICATE',
      nonce: 'l3m0nc45h'
    }));
    ```
  </Step>

  <Step title="Lemon Cash processes the request">
    The Lemon Cash mobile app receives the message and processes the request. It will prompt the user to confirm the action before executing it.
  </Step>

  <Step title="Lemon Cash responds">
    The Lemon Cash mobile app sends a response back to your mini app using `webViewRef.current.postMessage()`.

    ```typescript  theme={null}
    // Example: Authentication response
    webViewRef.current.postMessage(JSON.stringify({
      action: 'AUTHENTICATE_RESPONSE',
      data: {
        wallet: '0x...',
        signature: '0x...',
        message: '...'
      }
    }));
    ```
  </Step>

  <Step title="Mini app receives">
    Your mini app receives the response through event listeners and updates its state accordingly.
  </Step>
</Steps>

## Environment Detection

The SDK provides a [isWebView](/functions/is-webview) hook to detect if your app is running inside the Lemon Cash WebView:

```typescript  theme={null}
import { isWebView } from '@lemonatio/mini-app-sdk';

function MyMiniApp() {
  if (!isWebView()) {
    return <div>This app only works inside Lemon Cash</div>;
  }

  return <div>Welcome to your mini app!</div>;
}
```


# Authenticate
Source: https://lemoncash.mintlify.app/functions/authenticate

Authenticate a user using Sign In With Ethereum (SIWE).

The `authenticate` function will return the user's wallet address and a signed message that verifies wallet ownership. This should be the primary authentication method for your Mini App.

Uses [Sign In With Ethereum (SIWE)](https://eips.ethereum.org/EIPS/eip-4361) to sign a message that contains a nonce that should be generated in your backend.

## Usage

```typescript wrap theme={null}
import { authenticate } from '@lemonatio/mini-app-sdk';

export const MiniApp = () => {
  const [wallet, setWallet] = useState<string | undefined>(undefined);

  const handleAuthentication = async () => {
    const authentication = await authenticate();

    setWallet(authentication.wallet);
  };

  useEffect(() => {
    handleAuthentication();
  }, []);
};
```

## Parameters

```typescript  theme={null}
type AuthenticateInput = {
  nonce?: string;
  chainId?: ChainId;
}
```

<ParamField body="nonce" type="string">
  **If present, it must be at least 8 alphanumeric characters in length.**
  A unique nonce for the authentication request. This should be generated in your backend and be different for each authentication attempt.
</ParamField>

```typescript wrap focus={2} theme={null}
await authenticate({
  nonce: 'l3m0nc45h',
});
```

<ParamField body="chainId" type="ChainId">
  If your Mini App supports multiple chains, you can provide the chain id to use for the authentication request.
</ParamField>

```typescript wrap focus={4} theme={null}
import { ChainId } from '@lemonatio/mini-app-sdk';

await authenticate({
  chainId: ChainId.POLYGON_AMOY,
});
```

## Returns

<CodeGroup>
  ```typescript AuthenticateResponse theme={null}
  type AuthenticateResponse = {
    result: TransactionResult.SUCCESS;
    data: {
      wallet: string;
      signature: string;
      message: string;
    };
  } | {
    result: TransactionResult.FAILED;
    error: string;
  } | {
    result: TransactionResult.CANCELLED;
  };
  ```

  ```typescript SUCCESS icon="check" theme={null}
  {
      result: 'SUCCESS',
      data: {
        wallet: '0x1Ed17b06961B9B8DE78Ee924BcDaBC003aaE1867',
        signature: '0xba099e3ab31b8bf1201d2de2d0e4d81f7162f5de6993a960988959ff97be45b27d284a6e29d065cd175122953cf861725906639dc1f3229e66ff8b9d5820634a1b',
        message: 'web3-miniapps-svc.svc.staging.lemon wants you to sign in with your Ethereum account:\n0x1Ed17b06961B9B8DE78Ee924BcDaBC003aaE1867\n\nSign in with Ethereum to the app cbbe623b-be3d-4796-aa61-c93253a0a3af.\n\nURI: http://web3-miniapps-svc.svc.staging.lemon/auth/cbbe623b-be3d-4796-aa61-c93253a0a3af\nVersion: 1\nChain ID: 80002\nNonce: l3m0nc45h\nIssued At: 2025-09-03T19:02:52.697Z'
      }
  }
  ```

  ```typescript FAILED icon="ban" theme={null}
  {
      result: 'FAILED',
      error: 'Invalid signature'
  }
  ```

  ```typescript CANCELLED icon="user-minus" theme={null}
  {
      result: 'CANCELLED',
  }
  ```
</CodeGroup>

<ResponseField name="result" type="TransactionResult">
  The result of the authentication attempt.

  * `SUCCESS`: The authentication was successful.
  * `FAILED`: The authentication failed.
  * `CANCELLED`: The authentication was cancelled by the user.
</ResponseField>

<ResponseField name="data" type="object">
  Contains the wallet address, signature and message. Only present when the result is `SUCCESS`.

  * `wallet`: The wallet address of the authenticated user.
  * `signature`: The cryptographic signature proving the user's authentication.
  * `message`: The message that was signed by the user's wallet.
</ResponseField>

<ResponseField name="error" type="string">
  Contains the error message when the authentication fails. Only present when the result is `FAILED`.
</ResponseField>

### Complete Authentication Flow

**Backend endpoints**

The backend is responsible for generating a nonce and verifying the signature.

<CodeGroup>
  ```typescript generateNonce.ts theme={null}
  import crypto from 'crypto';

  // Generate a cryptographically secure nonce
  async function generateNonce(): Promise<string> {
    // Generate 32 random bytes and convert to hex
    const nonce = crypto.randomBytes(32).toString('hex');

    // TODO: Store the nonce in your database with:
    // - timestamp for expiration
    // - used flag to prevent replay attacks
    // - user identifier

    return nonce;
  }

  app.post('/api/auth/nonce', async (req, res) => {
      const nonce = await generateNonce();
      res.json({ nonce });
  });
  ```

  ```typescript verifySiweSignature.ts theme={null}
  import { verifySiweMessage } from 'viem';

  async function verifySiweSignature(
    wallet: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      // Before verification, check:
      // 1. Nonce exists in database and hasn't expired
      // 2. Nonce hasn't been used before
      // 3. Nonce matches the one in the signed message

      // Verify the SIWE signature (supports ERC-6492 for contract wallets)
      const isValid = await verifySiweMessage({
        message: message,
        signature: signature as `0x${string}`,
      });

      if (isValid) {
        // After verification mark nonce as used in database
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('SIWE signature verification error:', error);
      return false;
    }
  }

  app.post('/api/auth/verify', async (req, res) => {
    try {
      const { wallet, signature, message, nonce } = req.body;

      const isValidSignature = await verifySiweSignature(wallet, signature, message);

      if (isValidSignature) {
        res.json({ verified: true, wallet });
      } else {
        res.json({ verified: false, error: 'Invalid signature' });
      }
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Verification failed' });
    }
  });
  ```
</CodeGroup>

**Frontend React component:**

<CodeGroup>
  ```typescript MiniApp.tsx theme={null}
  import React, { useState, useEffect } from 'react';
  import { authenticate, ChainId, TransactionResult } from '@lemonatio/mini-app-sdk';
  import { getNonceFromBackend, verifySignatureOnBackend } from './api';

  export const MiniApp: React.FC = () => {
    const [wallet, setWallet] = useState<string | undefined>(undefined);

    const handleAuthenticate = async () => {
      // 1. Get a unique nonce from your backend
      const nonce = await getNonceFromBackend();

      // 2. Request the signature using the nonce
      const result = await authenticate({
        nonce,
        chainId: ChainId.POLYGON_AMOY
      });

      if (result.result !== TransactionResult.SUCCESS) {
        throw new Error(`Authentication failed: ${result.result}`);
      }

      const { wallet, signature, message } = result;

      // 3. Verify the signature on your backend
      const verificationResult = await verifySignatureOnBackend({
        wallet,
        signature,
        message,
        nonce,
      });

      if (verificationResult.verified) {
        setWallet(wallet);
      }
    };

    // Trigger authentication on component mount
    useEffect(() => {
      handleAuthenticate();
    }, []);

    return (
      <div>
        <h2>Wallet</h2>
        <p>
          Connected: {wallet ? '✅ Connected' : '❌ Not connected'}
        </p>

        {wallet && (
          <p>
            {wallet}
          </p>
        )}
      </div>
    );
  };
  ```

  ```typescript api/getNonceFromBackend.ts theme={null}
  // API function to get nonce from backend
  export async function getNonceFromBackend(): Promise<string> {
    const response = await fetch('/api/auth/nonce', { method: 'POST' });

    if (!response.ok) {
      throw new Error('Failed to get nonce from backend');
    }

    const { nonce } = await response.json();
    return nonce;
  }
  ```

  ```typescript api/verifySignatureOnBackend.ts theme={null}
  // API function to verify signature on backend
  export async function verifySignatureOnBackend({
    wallet,
    signature,
    message,
    nonce,
  }: {
    wallet: string;
    signature: string;
    message: string;
    nonce: string;
  }) {
    const response = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet,
        signature,
        message,
        nonce,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify signature');
    }

    return response.json();
  }
  ```
</CodeGroup>

### ERC-6492 Support

The smart contract wallet is deployed on the first user's transaction.

The `authenticate` method supports [ERC-6492](https://eips.ethereum.org/EIPS/eip-6492) for contract wallets that are not yet deployed. This means users can authenticate even before their wallet contract is deployed.

## Related Functions

<CardGroup cols={2}>
  <Card title="deposit" icon="arrow-down-right" href="/functions/deposit">
    Deposit funds to your Mini App Wallet.
  </Card>

  <Card title="Call Smart Contract" icon="code" href="/functions/call-smart-contract">
    Interact with smart contracts on the blockchain.
  </Card>
</CardGroup>


# Call Smart Contract
Source: https://lemoncash.mintlify.app/functions/call-smart-contract

Interact with smart contracts on the blockchain.

## Usage

```typescript  theme={null}
await callSmartContract({
  contractAddress: '0x1234567890123456789012345678901234567890',
  functionName: 'transfer',
  functionParams: [
    '0x0987654321098765432109876543210987654321',
    '1000000'
  ],
  value: '0'
});
```

## Parameters

```typescript  theme={null}
type CallSmartContractInput {
  contractAddress: '0x${string}';
  functionName: string;
  functionParams: string | number[];
  value: string;
  contractStandard?: ContractStandard;
  chainId?: ChainId;
}
```

<ParamField body="contractAddress" type="0x${string}" required>
  The address of the smart contract to interact with.
</ParamField>

<ParamField body="functionName" type="string" required>
  The name of the smart contract function to call.
</ParamField>

<ParamField body="functionParams" type="string | number[]" required>
  The parameters to pass to the smart contract function. Should be an empty array if no parameters are needed.
</ParamField>

<ParamField body="value" type="string" required>
  The amount of native currency (ETH, POL, etc.) to send with the transaction. Specify '0' if no native token is transferred.
</ParamField>

<ParamField body="contractStandard" type="ContractStandard">
  The contract standard if any (e.g., 'ERC20').
</ParamField>

<ParamField body="chainId" type="ChainId">
  If your Mini App supports multiple chains, you can specify the chain id to use.
</ParamField>

## Returns

<CodeGroup>
  ```typescript CallSmartContractResponse theme={null}
  type CallSmartContractResponse = {
    result: TransactionResult.SUCCESS;
    data: {
      txHash: string;
    };
  } | {
    result: TransactionResult.FAILED;
    error: MiniAppError;
  } | {
    result: TransactionResult.CANCELLED;
  }
  ```

  ```typescript SUCCESS icon="check" theme={null}
  {
    result: 'SUCCESS',
    data: {
      txHash: '0x1234567890123456789012345678901234567890'
    }
  }
  ```

  ```typescript FAILED icon="ban" theme={null}
  {
    result: 'FAILED',
    error: {
      message: 'Insufficient balance',
      code: 'INSUFFICIENT_BALANCE'
    }
  }
  ```

  ```typescript CANCELLED icon="user-minus" theme={null}
  {
    result: 'CANCELLED',
  }
  ```
</CodeGroup>

## Returns

<ResponseField name="result" type="TransactionResult">
  The result of the smart contract call attempt.

  * `SUCCESS`: The smart contract call was successful.
  * `FAILED`: The smart contract call failed.
  * `CANCELLED`: The smart contract call was cancelled by the user.
</ResponseField>

<ResponseField name="data" type="object">
  Contains the transaction hash of the smart contract call transaction. Only present when the result is `SUCCESS`.

  * `txHash`: The transaction hash.
</ResponseField>

<ResponseField name="error" type="MiniAppError">
  Contains the error information when the smart contract call fails. Only present when the result is `FAILED`.

  * `message`: The error message.
  * `code`: The error code.
</ResponseField>

## Demo

<div className="w-screen px-0 relative left-1/2 right-1/2 -mx-[50vw]">
  <video autoPlay muted loop playsInline className="w-full aspect-video rounded-xl" src="https://mintcdn.com/lemoncash/ukbvMA-LUIM5AsyM/assets/videos/demo-call-smart-contract.mov?fit=max&auto=format&n=ukbvMA-LUIM5AsyM&q=85&s=57c536348bc4e4dd05d2a08722d81377" data-path="assets/videos/demo-call-smart-contract.mov" />
</div>

## Related Functions

<CardGroup cols={2}>
  <Card title="Authenticate" icon="wallet" href="/functions/authenticate">
    Get user's wallet using SIWE.
  </Card>

  <Card title="Deposit" icon="arrow-down-right" href="/functions/deposit">
    Deposit funds to your Mini App Wallet.
  </Card>
</CardGroup>


# Deposit
Source: https://lemoncash.mintlify.app/functions/deposit

Initiate crypto deposits from Lemon Cash wallet to Mini App wallet.

## Usage

```typescript  theme={null}
const result = await deposit({
  amount: '100',
  tokenName: 'USDC',
});
```

## Parameters

```typescript  theme={null}
type DepositInput {
  amount: string;
  tokenName: string;
  chainId?: ChainId;
}
```

<ParamField body="amount" type="string" required>
  The amount to deposit.
</ParamField>

<ParamField body="tokenName" type="string" required>
  The token name (e.g., 'USDC', 'USDT', 'ETH').
</ParamField>

<ParamField body="chainId" type="ChainId">
  If your Mini App supports multiple chains, you can specify the chain id to use.
</ParamField>

## Returns

<CodeGroup>
  ```typescript DepositResponse theme={null}
  type DepositResponse = {
    result: TransactionResult.SUCCESS;
    data: {
      txHash: string;
    };
  } | {
    result: TransactionResult.FAILED;
    error: MiniAppError;
  } | {
    result: TransactionResult.CANCELLED;
  }
  ```

  ```typescript SUCCESS icon="check" theme={null}
  {
    result: 'SUCCESS',
    data: {
      txHash: '0x1234567890123456789012345678901234567890'
    }
  }
  ```

  ```typescript FAILED icon="ban" theme={null}
  {
    result: 'FAILED',
    error: {
      message: 'Insufficient balance',
      code: 'INSUFFICIENT_BALANCE'
    }
  }
  ```

  ```typescript CANCELLED icon="user-minus" theme={null}
  {
    result: 'CANCELLED',
  }
  ```
</CodeGroup>

## Returns

<ResponseField name="result" type="TransactionResult">
  The result of the deposit attempt.

  * `SUCCESS`: The deposit was successful.
  * `FAILED`: The deposit failed.
  * `CANCELLED`: The deposit was cancelled by the user.
</ResponseField>

<ResponseField name="data" type="object">
  Contains the transaction hash of the deposit transaction. Only present when the result is `SUCCESS`.

  * `txHash`: The transaction hash.
</ResponseField>

<ResponseField name="error" type="MiniAppError">
  Contains the error information when the deposit fails. Only present when the result is `FAILED`.

  * `message`: The error message.
  * `code`: The error code.
</ResponseField>

## Demo

<div className="w-screen px-0 relative left-1/2 right-1/2 -mx-[50vw]">
  <video autoPlay muted loop playsInline className="w-full aspect-video rounded-xl" src="https://mintcdn.com/lemoncash/ukbvMA-LUIM5AsyM/assets/videos/demo-deposit.mov?fit=max&auto=format&n=ukbvMA-LUIM5AsyM&q=85&s=5f403d4dc0832205c6d6c037f6803141" data-path="assets/videos/demo-deposit.mov" />
</div>

<Warning>
  **Important**: Deposits are blocked if your Mini App is connected to a testnet.
  Otherwise, deposits would discount real money from the Lemon App and credit test tokens in your Mini App wallet.

  Instead, send testnet tokens from a [Faucet](/testing/faucets.mdx) to your Mini App wallet address.
</Warning>

## Related Functions

<CardGroup cols={2}>
  <Card title="Call Smart Contract" icon="code" href="/functions/call-smart-contract">
    Interact with smart contracts on the blockchain.
  </Card>

  <Card title="Withdraw" icon="arrow-up-right" href="/functions/withdraw">
    Withdraw funds from your Mini App Wallet.
  </Card>
</CardGroup>


# Is WebView
Source: https://lemoncash.mintlify.app/functions/is-webview

Detect if your application is running inside a React Native WebView environment.

Use this function to enable or disable features related to Lemon Cash Mini Apps.

For safety, all methods: `authenticate`, `deposit`, `withdraw` and `callSmartContract` verify that they are being executed in a React Native WebView environment before trying before trying to communicate with the Lemon Cash App, and they return an error message if no React Native WebView is detected.

## Usage

```typescript wrap theme={null}
import { isWebView } from '@lemonatio/mini-app-sdk';

// Check if running in WebView environment
if (isWebView()) {
  console.log('✅ Running inside React Native WebView');
  // Safe to use SDK functions like authenticate, deposit, etc.
} else {
  console.log('❌ Not running in React Native WebView environment');
  // SDK functions will throw errors
}
```

## Parameters

This function takes no parameters.

## Returns

<ResponseField name="boolean" type="boolean">
  Returns `true` if the application is running inside a React Native WebView environment, `false` otherwise.
</ResponseField>

## Detection Methods

The function uses multiple detection strategies to ensure accurate React Native WebView identification:

### 1. ReactNativeWebView Object

Checks if `window.ReactNativeWebView` is available, which is the primary indicator of a React Native WebView environment.

### 2. User Agent String

Looks for `'ReactNativeWebView'` in the browser's user agent string.

### 3. CSS Class Detection

Checks if the document root element has the `'ReactNativeWebView'` CSS class.

### 4. SSR Safety

Returns `false` when `window` is undefined (server-side rendering scenarios).

## Complete Example

```typescript wrap theme={null}
import { isWebView } from '@lemonatio/mini-app-sdk';

export const MiniApp = () => {
  const [isInWebView, setIsInWebView] = useState<boolean>(false);

  useEffect(() => {
    // Check WebView environment on component mount
    const webViewStatus = isWebView();
    setIsInWebView(webViewStatus);
  }, []);

  return (
    <div>
      <h2>Mini App Status</h2>
      <p>
        WebView Environment: {isInWebView ? '✅ Available' : '❌ Not Available'}
      </p>

      {!isInWebView && (
        <p>
          Open this app in the Lemon Cash app to use all features.
        </p>
      )}
    </div>
  );
};
```

## UX Tips

* **Feature Gating**: Use this function to conditionally enable/disable features based on the environment.
* **User Experience**: Provide clear feedback when features are not available in the current environment.
* **Fallback Handling**: Implement graceful fallbacks for non-WebView environments.


# Withdraw
Source: https://lemoncash.mintlify.app/functions/withdraw

Withdraw funds from your Mini App Wallet to Lemon Wallet.

## Usage

```typescript  theme={null}
const result = await withdraw({
  amount: '50',
  tokenName: 'USDC',
});
```

## Parameters

```typescript  theme={null}
type WithdrawInput {
  amount: string;
  tokenName: string;
}
```

<ParamField body="amount" type="string" required>
  The amount to withdraw.
</ParamField>

<ParamField body="tokenName" type="string" required>
  The tokenName name (e.g., 'USDC', 'USDT', 'ETH').
</ParamField>

## Returns

<CodeGroup>
  ```typescript WithdrawResponse theme={null}
  type WithdrawResponse = {
    result: TransactionResult.SUCCESS;
    data: {
      txHash: string;
    };
  } | {
    result: TransactionResult.FAILED;
    error: MiniAppError;
  } | {
    result: TransactionResult.CANCELLED;
  }
  ```

  ```typescript SUCCESS icon="check" theme={null}
  {
    result: 'SUCCESS',
    data: {
      txHash: '0x1234567890123456789012345678901234567890'
    }
  }
  ```

  ```typescript FAILED icon="ban" theme={null}
  {
    result: 'FAILED',
    error: {
      message: 'Insufficient balance',
      code: 'INSUFFICIENT_BALANCE'
    }
  }
  ```

  ```typescript CANCELLED icon="user-minus" theme={null}
  {
    result: 'CANCELLED',
  }
  ```
</CodeGroup>

<ResponseField name="result" type="TransactionResult">
  The result of the withdrawal attempt.

  * `SUCCESS`: The withdrawal was successful.
  * `FAILED`: The withdrawal failed.
  * `CANCELLED`: The withdrawal was cancelled by the user.
</ResponseField>

<ResponseField name="data" type="object">
  Contains the transaction hash of the withdrawal transaction. Only present when the result is `SUCCESS`.

  * `txHash`: The transaction hash.
</ResponseField>

<ResponseField name="error" type="MiniAppError">
  Contains the error information when the withdrawal fails. Only present when the result is `FAILED`.

  * `message`: The error message.
  * `code`: The error code.
</ResponseField>

## Demo

<div className="w-screen px-0 relative left-1/2 right-1/2 -mx-[50vw]">
  <video autoPlay muted loop playsInline className="w-full aspect-video rounded-xl" src="https://mintcdn.com/lemoncash/ukbvMA-LUIM5AsyM/assets/videos/demo-withdraw.mov?fit=max&auto=format&n=ukbvMA-LUIM5AsyM&q=85&s=80c5732b9753f377db0b6c31d71a0590" data-path="assets/videos/demo-withdraw.mov" />
</div>

## Related Functions

<CardGroup cols={2}>
  <Card title="Deposit" icon="arrow-down-right" href="/functions/deposit">
    Deposit funds to your Mini App Wallet.
  </Card>

  <Card title="Call Smart Contract" icon="code" href="/functions/call-smart-contract">
    Interact with smart contracts on the blockchain.
  </Card>
</CardGroup>


# Build with AI
Source: https://lemoncash.mintlify.app/quickstart/build-with-ai

Use AI assistants to help you build Mini Apps faster

Copy the full documentation from [llms-full.txt](https://lemoncash.mintlify.app/llms-full.txt), or use the menu in each page, and paste it in your favorite AI chat tool.

<Frame>
  <img src="https://mintcdn.com/lemoncash/l7kbC58sXC0oBydn/assets/images/menu.png?fit=max&auto=format&n=l7kbC58sXC0oBydn&q=85&s=63acc38060771c52e4ed768a2df54967" data-og-width="1512" width="1512" data-og-height="884" height="884" data-path="assets/images/menu.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/lemoncash/l7kbC58sXC0oBydn/assets/images/menu.png?w=280&fit=max&auto=format&n=l7kbC58sXC0oBydn&q=85&s=70d6194c24d0320f37cd57de1cbf31cd 280w, https://mintcdn.com/lemoncash/l7kbC58sXC0oBydn/assets/images/menu.png?w=560&fit=max&auto=format&n=l7kbC58sXC0oBydn&q=85&s=9954e93332a4dafca39d7648e13df982 560w, https://mintcdn.com/lemoncash/l7kbC58sXC0oBydn/assets/images/menu.png?w=840&fit=max&auto=format&n=l7kbC58sXC0oBydn&q=85&s=0eaabc41ebf839becd16151e78ecd2b8 840w, https://mintcdn.com/lemoncash/l7kbC58sXC0oBydn/assets/images/menu.png?w=1100&fit=max&auto=format&n=l7kbC58sXC0oBydn&q=85&s=e5747fa45c3109606c2d4f160fdf2a7e 1100w, https://mintcdn.com/lemoncash/l7kbC58sXC0oBydn/assets/images/menu.png?w=1650&fit=max&auto=format&n=l7kbC58sXC0oBydn&q=85&s=332eb61373b3cabe562054aba799ce0c 1650w, https://mintcdn.com/lemoncash/l7kbC58sXC0oBydn/assets/images/menu.png?w=2500&fit=max&auto=format&n=l7kbC58sXC0oBydn&q=85&s=397e865952803dba2165a06e0ad7bd68 2500w" />
</Frame>


# Quickstart
Source: https://lemoncash.mintlify.app/quickstart/quickstart

Build your first Mini App integrated with Lemon Cash

Create a simple Mini App that authenticates users, triggers deposits and calls smart contract functions in just a few steps.

### Step 1: Install

<CodeGroup>
  ```bash npm theme={null}
  npm install @lemoncash/mini-app-sdk
  ```

  ```bash yarn theme={null}
  yarn add @lemoncash/mini-app-sdk
  ```
</CodeGroup>

### Step 2: Add authentication

Add authentication to your mini app using the [authenticate](/functions/authenticate) function:

```typescript focus{8} theme={null}
import { useState, useEffect } from 'react';
import { authenticate } from '@lemonatio/mini-app-sdk';

export const MiniApp = () => {
  const [wallet, setWallet] = useState<string | undefined>(undefined);

  const handleAuthentication = async () => {
    const authentication = await authenticate();
    setWallet(authentication.wallet);
  };

  useEffect(() => {
    handleAuthentication();
  }, []);
};
```

### Step 3: Add deposit functionality

Include [deposit](/functions/deposit) functionality in your mini app:

```typescript focus{7-10} theme={null}
import React from 'react';
import { deposit } from '@lemonatio/mini-app-sdk';

export const MiniApp = () => {
  const handleDeposit = async () => {
    try {
      const result = await deposit({
        amount: '100',
        tokenName: 'USDC',
      });

      console.log('Deposit successful:', result.txHash);
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error;
    }
  };

  return (
    <button onClick={handleDeposit}>
      Send 100 USDC
    </button>
  );
};
```

### Step 4: Check environment with isWebView (recommended)

Use [isWebView](/functions/is-webview) to provide clear feedback when the Mini App is not running inside the Lemon Cash app.

```typescript focus{4-6} theme={null}
import { isWebView } from '@lemonatio/mini-app-sdk';

export const MiniApp = () => {
  if (!isWebView()) {
    return <div>Please open this app in Lemon Cash</div>;
  }
};
```

## Full Example Implementation

Here's a complete example showing WebView communication:

```typescript  theme={null}
import React, { useEffect, useState } from 'react';
import { authenticate, deposit, isWebView } from '@lemonatio/mini-app-sdk';

export const MiniApp = () => {
  const [wallet, setWallet] = useState<string | undefined>(undefined);

  const handleAuthentication = async () => {
    const authentication = await authenticate();
    setWallet(authentication.wallet);
  };

  useEffect(() => {
    handleAuthentication();
  }, []);

  const handleDeposit = async () => {
    try {
      const result = await deposit({
        amount: '100',
        tokenName: 'USDC',
      });

      console.log('Deposit successful:', result.txHash);
    } catch (error) {
      console.error('Deposit failed:', error);
      throw error;
    }
  };

  if (!isWebView()) {
    return <div>Please open this app in Lemon Cash</div>;
  }

  return (
    <div>
      <span>
        {wallet
          ? `${wallet.slice(0, 8)}...${wallet.slice(-8)}`
          : 'Authenticating...'
        }
      </span>
      <button onClick={handleDeposit} disabled={!wallet}>
        {wallet ? 'Send 100 USDC' : 'Authenticating...'}
      </button>
    </div>
  );
};
```


# Faucets
Source: https://lemoncash.mintlify.app/testing/faucets

Get testnet tokens to test your Mini App

<Warning>
  **Important**: [Deposits](/functions/deposit.mdx) are blocked if your Mini App is connected to a testnet.
  Otherwise, deposits would discount real money from the Lemon App and credit test tokens in your Mini App wallet.

  Instead, send testnet tokens from a Faucet to your Mini App wallet address.
</Warning>

## USDC Testnet Faucet

Circle provides a free testnet faucet to get USDC on multiple test networks.

<Card title="Circle USDC Faucet" icon="droplet" href="https://faucet.circle.com/">
  Get 10 testnet USDC per hour on supported networks including Ethereum Sepolia, Polygon Amoy, Arbitrum Sepolia, and more.
</Card>

## Native Testnet Tokens

If you need native testnet tokens (ETH, POL, etc.), you can use the following faucet:

* [Alchemy](https://www.alchemy.com/faucets)


# Types
Source: https://lemoncash.mintlify.app/types/types

Type definitions for the Mini App SDK

## General Types

```typescript  theme={null}
type MiniAppError = {
  message: string;
  code: string;
};

type Address = `0x${string}`;
type Hex = `0x${string}`;
```

## Transaction Result

```typescript  theme={null}
enum TransactionResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
```

## Chain IDs

```typescript  theme={null}
enum ChainId {
  // Mainnet
  ARBITRUM_ONE = 42161,
  BASE = 8453,
  ETH = 1,
  OP_MAINNET = 10,
  POLYGON = 137,

  // Testnet
  ARBITRUM_SEPOLIA = 421614,
  ETH_HOODI = 560048,
  ETH_SEPOLIA = 11155111,
  POLYGON_AMOY = 80002,
}
```

## Token Names

```typescript  theme={null}
enum TokenName {
  ETH = 'ETH',
  POL = 'POL',
  USDC = 'USDC',
  USDT = 'USDT',
}
```

## Contract Standards

```typescript  theme={null}
enum ContractStandard {
  ERC20 = 'ERC20',
}
```
