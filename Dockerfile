FROM node:20-bookworm

RUN apt-get update
RUN apt-get install -y tini
RUN apt-get update
RUN apt-get install mecab libmecab-dev mecab-ipadic-utf8 make curl xz-utils file ca-certificates git sudo unzip patch --no-install-recommends -y
RUN apt-get clean
RUN rm -rf /var/lib/apt-get/lists/*
RUN git clone --depth 1 https://github.com/neologd/mecab-ipadic-neologd.git /opt/mecab-ipadic-neologd
RUN cat /opt/mecab-ipadic-neologd/libexec/make-mecab-ipadic-neologd.sh | sed "s/ja\.osdn\.net\/frs\/g\_redir\.php?m\=kent\&f\=mecab\%2Fmecab\-ipadic\%2F2\.7\.0\-20070801\%2F\${ORG_DIC_NAME}\.tar\.gz/jaist\.dl\.sourceforge\.net\/project\/mecab\/mecab\-ipadic\/2\.7\.0\-20070801\/mecab\-ipadic\-2\.7\.0\-20070801\.tar\.gz/g" | tee /opt/mecab-ipadic-neologd/libexec/make-mecab-ipadic-neologd.sh
RUN cd /opt/mecab-ipadic-neologd
RUN /opt/mecab-ipadic-neologd/bin/install-mecab-ipadic-neologd -n -y
RUN rm -rf /opt/mecab-ipadic-neologd
RUN echo "dicdir = /usr/lib/x86_64-linux-gnu/mecab/dic/mecab-ipadic-neologd/" > /etc/mecabrc
RUN apt-get purge git make curl xz-utils file -y;
RUN mkdir /ai
COPY . /ai
WORKDIR /ai
RUN npm install -g npm pnpm
RUN pnpm install
RUN pnpm build; exit 0

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD pnpm start
