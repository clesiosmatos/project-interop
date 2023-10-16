import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}
  async get() {
    const response = await this.httpService
      .get('http://localhost:8080/fhir/Patient')
      .toPromise();
    return response.data;
  }
  
  async create(): Promise<any> {
    const feedback = [];
    const fhirPatient = await this.transformer('Patient');
    const fhirObservation = await this.transformer('Observation');

    for(const patient of fhirPatient) {
      const responsePatient = await this.httpService
        .post('http://localhost:8080/fhir/Patient', patient)
        .toPromise();

        feedback.push({
          message: `Created resourceType: ${responsePatient.data.resourceType}, id: ${responsePatient.data.id}`,
        });
    }

    for(const observation of fhirObservation) {
      const responseObservation = await this.httpService
        .post('http://localhost:8080/fhir/Observation', observation)
        .toPromise();

        feedback.push({
          message: `Created resourceType: ${responseObservation.data.resourceType}, id: ${responseObservation.data.id}`,
        });
    }

    return feedback;
  }

  async transformer(resourceType: string) {
    const csvJson = await this.csvFileToJson();

    const fhirPatient = []
    const fhirObservation = []
    for(const patient of csvJson) {
      const transformedPatient = this.transformerPatient(patient);

      const patientJson = this.jsonToJson(
        this.mappingPatient(), transformedPatient
      );
      fhirPatient.push(patientJson);

      const transformedObservation = this.transformerObservation(patient);
      const observationJson = this.jsonToJson(
        this.mappingObservation(), transformedObservation
      );

      if((observationJson as any).code.coding[0].display.length) {
        fhirObservation.push(observationJson); 
      }
    }

    if(resourceType === 'Patient') {
      return fhirPatient;
    }  
    return fhirObservation;
  }

  transformerPatient(dataJson) {
    const script = `
    function changeMessage(data) {
      const moment = require('moment');
      data.NOME1 = data.NOME.split(' ')[0];
      data.NOME2 = data.NOME.split(' ')[1];
      data.NOME3 = data.NOME.split(' ')[2];
      data.SOBRENOME = data.NOME2;
      if(data.NOME.split(' ')[2]) {
        data.SOBRENOME = data.NOME2 + ' ' + data.NOME3; 
      }
      data.NOME = data.NOME1;
      data.NASCIMENTO = moment(data.NASCIMENTO, 'DD/MM/YYYY').format('YYYY-MM-DD');
      data.GENERO === 'Masculino' ? data.GENERO = 'male' : data.GENERO = 'female'; 
      return data; 
    }`;

    try {
      return eval(`(${script})(${JSON.stringify(dataJson)})`);
    } catch (error) {
      console.log('erro na execução do script: ' + error.message);
    }
  }

  transformerObservation(dataJson) {
    const script = `
    function changeMessage(data) {
      data.ID = 'Patient/' + data.ID; 
      return data; 
    }`;

    try {
      return eval(`(${script})(${JSON.stringify(dataJson)})`);
    } catch (error) {
      console.log('erro na execução do script: ' + error.message);
    }
  }

  mappingPatient(): Array<any> {
    return [
      { 
        inbound: "--Patient",
        outbound: "resourceType",
      },
      { 
        inbound: "ID",
        outbound: "id",
      },
      {
        inbound: "NOME",
        outbound: "name[0].given[0]",
      },
      {
        inbound: "SOBRENOME",
        outbound: "name[0].family",
      },
      {
        inbound: "--http://www.saude.gov.br/fhir/r4/StructureDefinition/BRPais-1.0",
        outbound: "extension[0].url",
      },
      {
        inbound: "--http://www.saude.gov.br/fhir/r4/CodeSystem/BRPais",
        outbound: "extension[0].valueCodeableConcept.coding[0].system",
      },
      {
        inbound: "PAIS",
        outbound: "extension[0].valueCodeableConcept.coding[0].code",
      },
      {
        inbound: "--official",
        outbound: "identifier.use",
      },
      {
        inbound: "--http://www.saude.gov.br/fhir/r4/NamingSystem/cpf",
        outbound: "identifier.system",
      },
      {
        inbound: "CPF",
        outbound: "identifier.value",
      },
      {
        inbound: "GENERO",
        outbound: "gender"
      },
      {
        inbound: "NASCIMENTO",
        outbound: "birthDate"
      },
      {
        inbound: "--phone",
        outbound: "telecom[0].system"
      },
      {
        inbound: "TELEFONE",
        outbound: "telecom[0].value"
      }
    ]
  }

  mappingObservation(): Array<any> {
    return [
      {
        inbound: "--Observation",
        outbound: "resourceType",
      },
      {
        inbound: "--http://loinc.org",
        outbound: "code.coding[0].system",
      },
      {
        inbound: "--15074-8",
        outbound: "code.coding[0].code",
      },
      {
        inbound: "OBSERVACAO",
        outbound: "code.coding[0].display",
      },
      {
        inbound: "ID",
        outbound: "subject.reference",
      },
      {
        inbound: "NOME",
        outbound: "subject.display",
      },
    ]
  }

  jsonToJson(mapping, jsonOrigin): Object {
    const jsonTarget = {};

    for (let i = 0; i < mapping.length; i += 1) {
      let { inbound, outbound } = mapping[i];

      if (inbound.includes('[')) {
        inbound = this.jsonToJsonConcatDot(
          inbound
        );
      }

      if (outbound.includes('[')) {
        outbound = this.jsonToJsonConcatDot(
          outbound
        );
      }

      let inboundParts = inbound.split('.');
      let outboundParts = outbound.split('.');
      let inboundDefault = false;

      if (inbound.includes('--')) {
        const inboundReplaced = inbound
          .replace('--', '');
        inboundParts = [inboundReplaced];
        inboundDefault = true;
      }
      if (outbound.includes('--')) {
        const outboundReplaced = outbound
          .replace('--', '');
        outboundParts = [outboundReplaced];
      }

      let inboundValue = jsonOrigin;
      let outboundValue = jsonTarget;

      for (let j = 0; j < inboundParts.length; j += 1) {
        inboundValue =
          inboundValue[Number(inboundParts[j]) 
            || inboundParts[j]] || '';
        if (inboundDefault) {
          inboundValue = inboundValue || inboundParts[j];
        }
      }

      for (let j = 0; j < outboundParts.length; j += 1) {
        if (j === outboundParts.length - 1) {
          outboundValue[outboundParts[j]] = inboundValue;
        } else {
          if (!outboundValue[outboundParts[j]]) {
            if (Number.isInteger(Number(outboundParts[j + 1]))) {
              outboundValue[outboundParts[j]] = [];
            } else {
              outboundValue[outboundParts[j]] = {};
            }
          }
          outboundValue = outboundValue[outboundParts[j]];
        }
      }
    }

    return jsonTarget;
  }

  jsonToJsonConcatDot(inOrOut) {
    const concatDot = [];
    if (inOrOut.includes('[')) {
      const braketParts = inOrOut.split('[');
      for (let j = 0; j < braketParts.length; j += 1) {
        concatDot.push(braketParts[j]);
      }
      const dotted = concatDot.join('.');
      return dotted.replaceAll(']', '');
    }
    return inOrOut;
  }
  
  async csvFileToJson() {
    const csvFile = fs.readFileSync('patients.csv', 'utf8');
    const csvToJson = require('csvtojson');
    const csvToJsonAsync = await csvToJson({ noheader: false })
      .fromString(csvFile);

    return csvToJsonAsync;
  }
}
