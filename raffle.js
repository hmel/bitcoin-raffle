const http = require('https');
const req = require('request');
const async = require('async');
const assert = require('assert');
const BN = require('big-integer');



//Ideas for guaranteeing
//use N next block hashes to generate the random number
//hash the value of the hash

var transactions = [];

//each address will be added 1 time for each ticket associated with it
var raffleTickets = [];


function getTransaction(txhash, callback) {
    req('https://api.blockcypher.com/v1/btc/main/txs/' + txhash.tx_hash, function(err, response, body) {
        if (!err) {
            var txinfo = JSON.parse(body);
            if (txinfo.error) {
                console.log(txinfo.error);
                process.exit(1);
            }
            transactions.push(txinfo);
            callback();
            return txinfo;
        } else {
            console.log("Can't get transaction info");
            callback(err);
        }
    });
}


function processTransaction(tx) {
    //console.log(tx);
    //console.log("addresses");
    //console.log(tx.addresses);
    //console.log("input addresses");
    //for (var x of tx.inputs) {
    //console.log(x.addresses);
//}
    //console.log("output addresses");
    //for (var x of tx.outputs) {
    //console.log(x.addresses);
//}
    //console.log("\n====");

    for (var out of tx.outputs) {
        assert(out.addresses.length === 1, "Multiple output addresses?!?");
        if (out.addresses.indexOf(raffleAddress) >= 0) {
            const nTickets = Math.floor(out.value / ticketPriceSatoshi);
            const address = tx.inputs[0].addresses[0];
            console.log("Address " + address + " gets " + nTickets + " Tickets");
            for (var x=0; x<nTickets; ++x) {
                raffleTickets.push(address);
            }
        }
    }
}

function getWinner(raffleAddress, blockHeight, ticketPriceSatoshi) {
    req('https://api.blockcypher.com/v1/btc/main/addrs/' + raffleAddress + "?unspentOnly=true&confirmations=1", function(err, response, body) {
        if (!err) {
            var addrInfo = JSON.parse(body);
            if (addrInfo.error) {
                console.log(addrInfo.error);
                process.exit(1);
            }
            async.forEach(addrInfo.txrefs, getTransaction, function(err) {
                if (err) {
                    console.log("Error processing transactions");
                    process.exit(1);
                } else {
                    //console.log("Transactions fetched!");

                    for (var tx of transactions) {
                        processTransaction(tx);
                    }
                    
                    raffleTickets.sort();
                    //console.log("===raffle tickets===");
                    //console.log(raffleTickets);
                    
                    req('https://api.blockcypher.com/v1/btc/main/blocks/' + winningBlockHeight + '?limit=0', function(err, response, body) {
                        if (!err) {
                            var block = JSON.parse(body);
                            if (block.error) {
                                console.log(block.error);
                                process.exit(1);
                            }
                            console.log("Block hash is " + block.hash);
                            var hash = BN(block.hash, 16);
                            console.log("Total tickets in raffle " + raffleTickets.length);
                            var idx = hash.mod(raffleTickets.length);
                            console.log("Winning address is at index " + idx);
                            console.log("Winning address is " + raffleTickets[idx]);
                        } else {
                            console.log("Failed to fetch block at height", winningBlockHeight);
                            process.exit(1);
                        }
                    });
                }
            });
        } else {
            console.log('Error fetching address info');
            process.exit(1);
        }
    });
}

if (process.argv.length < 5) {
    console.log("Usage:\n nodejs raffle.js <raffleAddress> <winningBlockHeigth> <ticketPriceSatoshi>");
    return;
} else {
    const raffleAddress = process.argv[2];
    const winningBlockHeight = process.argv[3];
    const ticketPriceSatoshi = process.argv[4];

    getWinner(raffleAddress, winningBlockHeight, ticketPriceSatoshi);
}

    



