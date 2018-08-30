import React, { Component } from 'react';

class TextArea extends Component {
    constructor(props) {
        super(props);

        this.state = {
            value: null
        }
    }

    submit() {
        this.props.submitCallback(this.state.value);
    }

    cancelEditing() {
        this.props.cancelCallback();
    }

    render() {
        return(
            <div>
                <textarea className='form-control w-100 mb-1' row='4' name='body' defaultValue={this.props.value}
                onChange={(e) => {
                    this.setState({
                        value: e.target.value
                    })
                }}>
                </textarea>
                <div className='text-right'>
                    <button className='btn btn-primary mr-1' onClick={this.submit.bind(this)}>Submit</button>
                    <button className='btn btn-secondary' onClick={this.cancelEditing.bind(this)}>Cancel</button>
                </div>
            </div>
        )
    }
}

export default TextArea;