node {
    stage 'Step 1: Test'
        build job: 'Service Testing/Unit testing/Address Service Test', parameters: [[$class: 'StringParameterValue', name: 'Branch', value: '*/Development']]
    stage 'Step 2: Deploy to Integration'
        build job: 'Service Deployment/Deploy to Integration', parameters: [[$class: 'StringParameterValue', name: 'Repo', value: 'git@github-project-address:UKForeignOffice/loi-address-service.git'], [$class: 'StringParameterValue', name: 'Branch', value: 'Development'], [$class: 'StringParameterValue', name: 'Tag', value: 'address-service-int'], [$class: 'StringParameterValue', name: 'Container', value: 'address-service']]
}
