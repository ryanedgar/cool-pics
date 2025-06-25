const fs = require('fs');
const path = require('path');

class ConfigurationManager {

  constructor(appRoot, filename){
    this.filePath = path.join(appRoot, filename);
  }

  configure(){
    let defaultData = {
      "flickrApiKey" : "Add API Key to configuration",
      "flickrApiSecret" : "Add Secret to configuration"
    }

    return new Promise((resolve, reject) => {
      try{
        fs.readFile(this.filePath, {encoding: 'utf-8'}, (err, data) => {
          if (err) reject(defaultData);
          try{
            resolve(JSON.parse(data));
          }
          catch(parseError){
            console.error(parseError);
            reject(defaultData);
          }
        });
      }
      catch(fsError){
        console.error(fsError);
        reject(defaultData);
      }
    });
  }
}

module.exports = ConfigurationManager;
