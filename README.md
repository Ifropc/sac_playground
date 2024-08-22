Contracts from https://github.com/fazzatti/oi-fifo-soroban-demos

Test setup:
There are 2 SAC, 1 regular and 1 wrapped. There's an admin account for both regular and wrapped SACs
Tests make sure that alice have trustline for both SAC, but can only transfer regular SAC
Wrapped SAC is not transferable with regular SAC contract.
However, Alice can transfer wrapped SAC using Proxy contract.
Finally, there are tests for using simple swap contract, that uses token inferface and swaps regular sac <-> wrapped sac 
between Alice and Bob