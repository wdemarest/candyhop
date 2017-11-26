# Candy Hop

# TO SETUP A NEW SERVER

1. If you need to generate a keypair (typically you'll let AWS do this for you)
    openssl genrsa -des3 -out jeesty.pem 2048
    openssl rsa -in jeesty.pem -outform PEM -pubout -out jeesty.pub
    chmod 400 ~/.ssh/jeesty.pub
    chmod 400 ~/.ssh/jeesty.pem

2. Boot a fresh Ubuntu instance at EC2
    Visit aws.amazon.com, login and access EC2
    Click [Launch]
    Pick "Ubuntu Server 16.04 LTS (HVM), SSD Volume Type"
    Pick "t2.micro - free tier eligible"
    Accept all defaults for storage, security, etc.
    Pick [Launch], and create a new keypair
    Save it as ~/.ssh/jeesty.pem
    chmod 400 ~/.ssh/jeesty.pem

3. Setup the .pem file
From local osx terminal:

    cd ~/.ssh
    pico CandyHop.pem
    copy/paste the private key you used to boot the AWS machine into that file
    ctrl-x  y  <enter>

4. Secure shell to the remote

    ssh -i "~/.ssh/jeesty.pem" ubuntu@54.152.44.153

5. Install NodeJs and Git

    sudo apt-get update
    sudo apt-get install git
    sudo apt-get install nodejs
    sudo apt-get install npm
    sudo npm install -g supervisor

6. Clone the repo

    cd ~
    git clone https://github.com/wdemarest/candyhop
    cd candyhop
    sudo npm install

7. direct port 8080 to port 80

    iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 8080

8. Setup your ~/candyhop/config.json file.

    {
            "port": 8080,                                                                                        
            "sitePath": "site",
            "contactEmail": "will.demarest@gmail.com",
            "mandrillApiKey": "",
            "credentialsFile": "credentials.json",
            "userDataFile": "userdata.json"
    }

9. Edit the ./ssh/known_hosts file and paste appropriate public keys

10. Get a Mandrill account
   - verify the email address
   - add a DKIM record
- setup postfix on the server:
   http://www.techknowjoe.com/article/create-your-own-email-forwarding-server

# Running the Server

While logged in to the koding.com server, or any machine that has its public key on
the playcandyhop.com server, run:

    ./pch [ deploy | stop | start | restart | watch ]

deploy - forces the playcandyhop.com machine to conform to the git master
stop - stops the server
start - starts the server
restart - shuts down any running server and starts it up fresh, with auto-restarting
watch - shows the server's log file

# To sign players up

1. Visit http://playcandyhop.com
2. Login with the username "admin" and the admin password
3. http://playcandyhop.com/signup.html

# Public Key

For reference, here is the public key to connect using CandyHop.pem:
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCdzhJlKt5CPCB0oX5Jt8ctjgr2Scdw0ARKb4c6hW3rqHzGU8K7q+W4ulVIGJzrCB5o1lVvcfzEPu37rdon1VngZMHAhEtf5SyNxIbOBqXrCpge2UvMUDW8fxOez1O+pVotx4IYoC1jzwfJEWD6LFmGUuKVxTxbkUCNmPiosECGBMEHvrsOWsFL9vUXhp/WrnMPP/KGCMN6Wm0W1kxlv8ISp6tQ8Zi3u4by0C+5FSKW7Ta5Z9EzdxKRMVyPw0Kw3Y9QiLYEoSkM5B3UcXtK+eCL2AR8nE/ul/kRdG/QfDrW3Bf+QDX5MClCVXtk0qIn7q/U65kr4embszEwOBzB8BAB CandyHop
