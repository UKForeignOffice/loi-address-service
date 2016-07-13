node {
    stage 'Step 1: Test'
        build job: 'Service Testing/Unit testing/Address Service Test', parameters: [[$class: 'StringParameterValue', name: 'Branch', value: '*/Pre-Production']]
    stage 'Step 2: Deploy to Pre-Production'
        build job: 'Service Deployment/Deploy to PreProduction', parameters: [[$class: 'StringParameterValue', name: 'Repo', value: 'git@github-project-address:UKForeignOffice/loi-address-service.git'], [$class: 'StringParameterValue', name: 'Branch', value: 'Pre-Production'], [$class: 'StringParameterValue', name: 'Tag', value: 'address-service-preprod'], [$class: 'StringParameterValue', name: 'Container', value: 'address-service']]
}
