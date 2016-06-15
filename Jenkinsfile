node {
    stage 'Step 1: Test'
        build job: 'Address Service Test', parameters: [[$class: 'StringParameterValue', name: 'Branch', value: '*/Pre-Production']]
    stage 'Step 2: Deploy to Pre-Production'
        build job: 'Deploy to Integration', parameters: [[$class: 'StringParameterValue', name: 'Repo', value: 'https://github.com/UKForeignOffice/loi-address-service.git/'], [$class: 'StringParameterValue', name: 'Branch', value: 'Pre-Production'], [$class: 'StringParameterValue', name: 'Tag', value: 'address-service-preprod'], [$class: 'StringParameterValue', name: 'Container', value: 'address-service']]
}