node {
    stage 'Step 1: Test'
        build job: 'Address Service Test', parameters: [[$class: 'StringParameterValue', name: 'Branch', value: '*/Development']]
    stage 'Step 2: Deploy to Integration'
        build job: 'Deploy to Integration', parameters: [[$class: 'StringParameterValue', name: 'Repo', value: 'https://github.com/UKForeignOffice/loi-address-service.git/'], [$class: 'StringParameterValue', name: 'Branch', value: 'Development'], [$class: 'StringParameterValue', name: 'Tag', value: 'address-service-int'], [$class: 'StringParameterValue', name: 'Container', value: 'address-service']]
}