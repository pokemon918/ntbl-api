# ntbl-api

Source to the NoteAble core API.


## Development Guidelines

Read the backend development [GUIDELINES](GUIDELINES.md) to get familiar with our tooling.



## Seed a competition

To run a seed you should have node installed. After running `node install && npm install -g yarn ts-node` you can create a user and use the credentials to the right backend with the seed-contest-v2 command. Example: 

    API=https://demo-api.ntbl.link PORT=443 EMAIL=swa2020@noteable.co PASS=xxxyyyy yarn seed-contest-v2

This is a proxy for running 

	API=https://demo-api.ntbl.link PORT=443 EMAIL=swa2020@noteable.co PASS=xxxyyyy ts-node process/contest/seed/seedContestSWAdatav2.ts

`seedContestSWAdatav2.ts` got all the steps and is currently set to load data from `process/contest/data/finalSwa2020R3.json`


