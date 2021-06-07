#!/bin/bash

# 引数が0個ならHelpを出す
if [ $# -eq 0 ]; then
  echo "Usage: clsp <fileName> [push|deploy]"
# 引数が1個ならSettingする
elif  [ $# -eq 1 ]; then
  echo "I copied .clasp.json from the template"
  cp .clasp.json.tmpl .clasp.json
  echo "clasp setting scriptId $1.sid"
  SID=`cat $1.sid`
  clasp setting scriptId $SID 
# 第2引数がpushならpushする
elif  [ $2 = "push" ]; then
  echo "I copied .clasp.json from the template"
  cp .clasp.json.tmpl .clasp.json
  echo "push $1.sid"
  SID=`cat $1.sid`
  clasp setting scriptId $SID 
  clasp push
  #clasp setting scriptId DUMMY
# 第2引数がdeployならpush+deployする
elif  [ $2 = "deploy" ]; then
  echo "I copied .clasp.json from the template"
  cp .clasp.json.tmpl .clasp.json
  echo "push $1.sid"
  SID=`cat $1.sid`
  clasp setting scriptId $SID 
  clasp push
  echo "deploy $1.did"
  DID=`cat $1.did`
  clasp deploy -i $DID
  echo "deploy deploymentId =$DID"
  #clasp setting scriptId DUMMY
else
  echo "unknown"
fi
