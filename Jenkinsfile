node {
    stage 'Step 1: Test'
        build job: 'Service Testing/Unit testing/Address Service Test', parameters: [[$class: 'StringParameterValue', name: 'Branch', value: '*/master']]
    stage 'Step 2: Create Production Image'
        build job:  'Service Deployment/Production Deployment/Create Production Images', parameters: [[$class: 'StringParameterValue', name: 'Repo', value: 'git@github-project-address:UKForeignOffice/loi-address-service.git'], [$class: 'StringParameterValue', name: 'Branch', value: 'master'], [$class: 'StringParameterValue', name: 'Tag', value: 'address-service-prod'], [$class: 'StringParameterValue', name: 'Container', value: 'address-service']]
}