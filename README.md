HAPI FHIR é uma biblioteca Java de código aberto que facilita a implementação do padrão HL7 FHIR para troca de informações em saúde. Promovendo interoperabilidade, permite aos desenvolvedores criar e integrar sistemas compatíveis com o padrão FHIR, contribuindo para uma comunicação mais eficaz entre diferentes sistemas de saúde.

## Configuração do servidor fhir
[1] - git clone do projeto hapi fhir

[2] - alterando configurações do docker-compose.yml e application.xml para rodar a aplicação usando o banco de dados postgres

[3] - testando a aplicação

## Algoritmo de interoperabilidade
Foi realizado a implementação de algoritmo que é capaz de transformar qualquer payload em json para outro formato usando um mapeamento. Com isso fui caapaz de extrair os dados do arquivo csv e tranformar no formato fhir para depois enviar para o servidor hapi fhir, segregado por recurso, sendo Patient e Observation.

Para isso, utilizei o framework Nestjs que utiliza Nodejs + Typescript. O projeto encontra-se dentro da pasta /app

## Bônus
Fui capaz de subir as definitions FHIR originais usando hapi-fhir-cli, porém não consegui subir ainda o structure definition do resource Patient da RNDS. Com mais tempo, seria possível.
