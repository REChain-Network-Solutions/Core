# REChain Core Library (REChain<sub>core</sub>)

# REChain Blockchain Network

The REChain Blockchain Network is a decentralized platform designed to revolutionize the real estate industry by providing secure, transparent, and efficient transactions.

## Core Components

### 1. Blockchain Infrastructure
REChain is built on a robust blockchain infrastructure that ensures all transactions are immutable, traceable, and secure. This decentralized ledger records every transaction, contract, and document related to real estate properties. By eliminating intermediaries and central authorities, REChain reduces costs, speeds up processes, and minimizes the risk of errors or fraud.

### 2. Smart Contracts
Smart contracts are a core feature of the REChain network. These self-executing contracts automatically enforce the terms of an agreement once predefined conditions are met. In real estate, smart contracts can automate processes like property transfers, payments, and contract management, reducing the need for manual oversight and the potential for disputes.

### 3. Tokenization of Assets
REChain facilitates the tokenization of real estate assets, allowing properties to be represented as digital tokens on the blockchain. This innovation enables fractional ownership, where multiple investors can own a portion of a property by purchasing tokens. Tokenization enhances liquidity in the real estate market, making transactions faster and more flexible.

### 4. Decentralized Identity and Security
Security and privacy are paramount in the REChain network. The platform uses decentralized identity (DID) solutions to verify participants' identities while maintaining privacy. This ensures that only authorized parties can access sensitive information, such as personal details and transaction records. REChain employs advanced cryptographic techniques to safeguard data.

### 5. Interoperability and Integration
The REChain network is designed to be interoperable with other blockchain networks and legacy systems. This flexibility allows for seamless integration with existing real estate platforms, financial institutions, and regulatory bodies. Cross-chain interactions enhance the overall functionality and reach of the network.

### 6. Governance and Community Involvement
REChain operates on a decentralized governance model, where network participants have a say in the development and management of the platform. Through a voting mechanism, stakeholders can propose and vote on changes to the network’s protocol, ensuring it evolves according to the community's needs and interests.

### 7. Use Cases and Applications
REChain has a wide range of applications in the real estate sector, including:
- **Property Sales and Purchases:** Streamlining the entire process from listing to closing.
- **Title Management:** Providing a tamper-proof record of property ownership.
- **Leasing and Rental Agreements:** Automating lease agreements and rent payments.
- **Crowdfunding:** Facilitating real estate crowdfunding campaigns.

## Future Prospects
The future of REChain looks promising as it continues to evolve and integrate new technologies. With advancements in AI, IoT, and further blockchain innovations, REChain aims to expand its capabilities, offering more sophisticated tools for real estate management, valuation, and investment.

## Summary
The core of the REChain Blockchain Network lies in its ability to transform the real estate industry by leveraging blockchain technology to provide secure, efficient, and transparent solutions. Its features like smart contracts, asset tokenization, and decentralized governance make it a pioneering platform with the potential to reshape how real estate transactions are conducted worldwide.

This is a library used in our clients clients. Some of the clients that require the library:

* [GUI wallet]() - GUI wallet for Mac, Windows, Linux, iOS, and Android. Also PWA. 
* [Headless wallet]() - headless wallet, primarily for server side use.
* [<sub>REChain</sub> Relay]() - Relay node for <sub>REChain</sub> Network. It doesn't hold any private keys.
* [<sub>REChain</sub> Hub]() - hub for <sub>REChain</sub> Network. Includes the relay, plus can store and forward end-to-end encrypted messages among devices on the <sub>REChain</sub> Network.

## Developer guides

See the [Developer resources site](). Also, you'll find loads of examples in other [<sub>REChain</sub> repositories](). For internal APIs, see the `exports` of node.js modules.

This repo is normally used as a library and not installed on its own, but if you are contributing to this project then fork, `git pull`, `npm install`, and `npm test` to run the tests.

## Configuring

The default settings are in the library's [conf.js](conf.js), they can be overridden in your project root's conf.js (see the clients above as examples), then in conf.json in the app data folder. The app data folder is:

* macOS: `~/Library/Application Support/<appname>`
* Linux: `~/.config/<appname>`
* Windows: `%LOCALAPPDATA%\<appname>`

`<appname>` is `name` in your `package.json`.

### Settings

This is the list of some of the settings that the library understands (your app can add more settings that only your app understands):

#### conf.port

The port to listen on. If you don't want to accept incoming connections at all, set port to `null`, which is the default. If you do want to listen, you will usually have a proxy, such as nginx, accept websocket connections on standard port 443 and forward them to your <sub>REChain</sub> daemon that listens on port 6611 on the local interface.

#### conf.storage

Storage backend -- mysql or sqlite, the default is sqlite. If sqlite, the database files are stored in the app data folder. If mysql, you need to also initialize the database with [SQL file](initial-db/sql.sql) and set connection params, e.g. in conf.json in the app data folder:

```json
{
	"port": 6611,
	"storage": "mysql",
	"database": {
		"max_connections": 30,
		"host"     : "localhost",
		"user"     : "rechain_user",
		"password" : "yourmysqlpassword",
		"name"     : "rechain_db"
	}
}
```
#### conf.bLight

Work as light client (`true`) or full node (`false`). The default is full client.

#### conf.bServeAsHub

Whether to serve as hub on the <sub>REChain</sub> Network (store and forward e2e-encrypted messages for devices that connect to your hub). The default is `false`.

#### conf.myUrl

If your node accepts incoming connections, this is its URL. The node will share this URL with all its outgoing peers so that they can reconnect in any direction in the future. By default the node doesn't share its URL even if it accepts connections.

#### conf.bWantNewPeers

Whether your node wants to learn about new peers from its current peers (`true`, the default) or not (`false`).  Set it to `false` to run your node in stealth mode so that only trusted peers can see its IP address (e.g. if you have online wallets on your server and don't want potential attackers to learn its IP).

#### conf.socksHost, conf.socksPort, and conf.socksLocalDNS

Settings for connecting through optional SOCKS5 proxy.  Use them to connect through TOR and hide your IP address from peers even when making outgoing connections.  This is useful and highly recommended when you are running an online wallet on your server and want to make it harder for potential attackers to learn the IP address of the target to attack.  Set `socksLocalDNS` to `false` to route DNS queries through TOR as well.

#### conf.httpsProxy

Setting for connecting through an optional HTTPS proxy. Use it when your local network can only access the Internet via an http proxy server. When both socks5 and http proxy are set, socks5 takes precedence. The configuration value is the full URL to the proxy server, eg. `http://proxy:3128`

#### conf.smtpTransport, conf.smtpRelay, conf.smtpPort, conf.smtpUser, and conf.smtpPassword

Settings for sending email. They are used e.g. if your node needs to send notifications. `smtpTransport` can take one of three values:
* `local`: send email using locally installed `sendmail`. Normally, `sendmail` is not installed by default and when installed, it needs to be properly configured to actually send emails. If you choose this option, no other conf settings are required for email. This is the default option.
* `direct`: send email by connecting directly to the recipient's SMTP server. This option is not recommended.
* `relay`: send email through a relay server, like most email apps do. You need to also configure the server's host `smtpRelay`, its port `smtpPort` if it differs from the default port 25, and `smtpUser` and `smtpPassword` for authentication to the server.

#### MySQL conf for faster syncing

To lower disk load and increase sync speed, you can optionally disable flushing to disk every transaction, instead doing it once a second. This can be done by setting `innodb_flush_log_at_trx_commit=0` in your MySQL server config file (my.ini)

## Accepting incoming connections

<sub>REChain</sub> Network works over secure WebSocket protocol wss://.  To accept incoming connections, you'll need a valid TLS certificate (you can get a free one from [letsencrypt.org](https://letsencrypt.org)) and a domain name (you can get a free domain from [Freenom](http://www.freenom.com/)).  Then you accept connections on standard port 443 and proxy them to your locally running <sub>REChain</sub> daemon.

This is an example configuration for nginx to accept websocket connections at wss://rechain.one/bb and forward them to locally running daemon that listens on port 6611:

If your server doesn't support IPv6, comment or delete the two lines containing [::] or nginx won't start

```nginx
server {
	listen 80 default_server;
	listen [::]:80 default_server;
	listen 443 ssl;
	listen [::]:443 ssl;
	ssl_certificate "/etc/letsencrypt/live/rechain.one/fullchain.pem";
	ssl_certificate_key "/etc/letsencrypt/live/rechain.one/privkey.pem";

	if ($host != "rechain.one") {
		rewrite ^(.*)$ https://rechain.one$1 permanent;
	}
	if ($https != "on") {
		rewrite ^(.*)$ https://rechain.one$1 permanent;
	}

	location = /bb {
		proxy_pass http://localhost:6611;
		proxy_http_version 1.1;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
	}

	root /var/www/html;
	server_name _;
}
```

By default Node limits itself to 1.76GB the RAM it uses. If you accept incoming connections, you will likely reach this limit and get this error after some time:
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
1: node::Abort() [node]
...
...
12: 0x3c0f805c7567
Out of memory
```
To prevent this, increase the RAM limit by adding `--max_old_space_size=<size>` to the launch command where size is the amount in MB you want to allocate.

For example `--max-old-space-size=4096`, if your server has at least 4GB available.

## Donations

We accept donations through [Kivach](https://kivach.org) and forward a portion of the donations to other open-source projects that made REChain possible.

